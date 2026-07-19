import { EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GarmentVisionService } from '../ai/garment-vision.service';
import type { GarmentVisionResult } from '../ai/dto/garment-vision-result.dto';
import { Garment } from '../dal/entity/garment.entity';
import { User } from '../dal/entity/user.entity';
import { GarmentService } from './garment.service';
import { GARMENT_TAG_TAXONOMY } from './garment-tag-taxonomy';

export const BACKFILL_LIMIT_DEFAULT = 3;
export const BACKFILL_LIMIT_MAX = 3;
const BACKFILL_TIME_BUDGET_MS = 90_000;
const BACKFILL_TIME_RESERVE_MS = 15_000;
const BACKFILL_NO_PHOTO_ITEMS_MAX = 500;

export interface MiniappAdminUserSummary {
  id: number;
  displayName: string;
  nickname: string;
  wechatOpenIdMasked: string;
  garmentCount: number;
}

export type BackfillFailureReason =
  | 'image-unreadable'
  | 'storage-error'
  | 'database-error';

export interface MiniappGarmentTagBackfillResult {
  targetUserId: number;
  requestedLimit: number;
  effectiveLimit: number;
  total: number;
  withPhoto: number;
  attemptedThisRun: number;
  analyzedThisRun: number;
  filledGarmentCount: number;
  filledFieldCount: number;
  unchangedCount: number;
  unreadableCount: number;
  failedCount: number;
  mirrorConflictCount: number;
  noPhotoCount: number;
  remainingUnattempted: number;
  completionState:
    | 'needs-retry'
    | 'has-more'
    | 'photo-complete'
    | 'photo-complete-with-no-photo';
  deadlineReached: boolean;
  noPhotoItems: Array<{ id: number; name: string }>;
  noPhotoItemsTruncated?: boolean;
  failedItems: Array<{
    id: number;
    name: string;
    reason: BackfillFailureReason;
  }>;
}

@Injectable()
export class MiniappAdminService {
  private readonly activeBackfillUserIds = new Set<number>();

  constructor(
    @InjectRepository(User)
    private readonly userRepository: EntityRepository<User>,
    @InjectRepository(Garment)
    private readonly garmentRepository: EntityRepository<Garment>,
    private readonly garmentVisionService: GarmentVisionService,
    private readonly garmentService: GarmentService,
    private readonly configService: ConfigService,
  ) {}

  async isAdmin(userId?: number): Promise<boolean> {
    if (userId == null) return false;

    const adminUserIds = this.configValues('MINIAPP_ADMIN_USER_IDS');
    if (adminUserIds.has(String(userId))) return true;

    const adminOpenIds = this.configValues('MINIAPP_ADMIN_WECHAT_OPEN_IDS');
    if (adminOpenIds.size === 0) return false;

    const user = await this.userRepository.findOne(userId);
    return Boolean(user?.wechatOpenId && adminOpenIds.has(user.wechatOpenId));
  }

  async listUsers(adminUserId?: number): Promise<MiniappAdminUserSummary[]> {
    await this.assertAdmin(adminUserId);

    const users = await this.userRepository.find(
      {},
      { orderBy: { id: 'ASC' } },
    );
    const garments = await this.garmentRepository.find(
      {},
      { populate: ['owner'] },
    );
    const garmentCounts = new Map<number, number>();

    for (const garment of garments) {
      const ownerId = garment.owner?.id;
      if (ownerId == null) continue;
      garmentCounts.set(ownerId, (garmentCounts.get(ownerId) ?? 0) + 1);
    }

    return users.map((user) => ({
      id: user.id,
      displayName: this.displayName(user),
      nickname: user.nickname ?? '',
      wechatOpenIdMasked: this.maskOpenId(user.wechatOpenId),
      garmentCount: garmentCounts.get(user.id) ?? 0,
    }));
  }

  async findUserGarments(
    adminUserId: number | undefined,
    targetUserId: number,
  ): Promise<Garment[]> {
    await this.assertAdmin(adminUserId);
    const user = await this.userRepository.findOne(targetUserId);
    if (!user) throw new NotFoundException('用户不存在');

    return this.garmentRepository.find(
      { owner: { id: targetUserId } },
      { populate: ['photo'], orderBy: { id: 'ASC' } },
    );
  }

  async backfillUserGarmentTags(
    adminUserId: number | undefined,
    targetUserId: number,
    requestedLimit: number,
  ): Promise<MiniappGarmentTagBackfillResult> {
    await this.assertAdmin(adminUserId);
    const user = await this.userRepository.findOne(targetUserId);
    if (!user) throw new NotFoundException('用户不存在');

    if (this.activeBackfillUserIds.has(targetUserId)) {
      throw new ConflictException('该用户正在补标签，请稍后刷新');
    }
    this.activeBackfillUserIds.add(targetUserId);

    try {
      if (!this.hasQwenApiKey()) {
        throw new ServiceUnavailableException(
          'AI 补标签暂不可用，请检查 AI 配置',
        );
      }

      const effectiveLimit = this.effectiveBackfillLimit(requestedLimit);
      const garments = await this.garmentRepository.find(
        { owner: { id: targetUserId } },
        { populate: ['photo'], orderBy: { id: 'ASC' } },
      );
      const withPhoto = garments.filter((garment) => this.hasPhoto(garment));
      const noPhotoItems = garments
        .filter((garment) => !this.hasPhoto(garment))
        .map((garment) => this.itemSummary(garment));
      const pending = withPhoto.filter((garment) => !garment.tagsBackfilledAt);
      const failedItems: MiniappGarmentTagBackfillResult['failedItems'] = [];
      const deadlineAt = Date.now() + BACKFILL_TIME_BUDGET_MS;
      let attemptedThisRun = 0;
      let analyzedThisRun = 0;
      let filledGarmentCount = 0;
      let filledFieldCount = 0;
      let unchangedCount = 0;
      let unreadableCount = 0;
      let failedCount = 0;
      let mirrorConflictCount = 0;
      let deadlineReached = false;

      for (const garment of pending) {
        if (attemptedThisRun >= effectiveLimit) break;
        if (
          Date.now() + this.visionTimeoutMs() >
          deadlineAt - BACKFILL_TIME_RESERVE_MS
        ) {
          deadlineReached = true;
          break;
        }

        attemptedThisRun += 1;
        const item = this.itemSummary(garment);
        let analysis: GarmentVisionResult;
        try {
          analysis = await this.garmentVisionService.analyzeImage(
            garment.photo!.fileName,
          );
        } catch {
          failedCount += 1;
          failedItems.push({ ...item, reason: 'image-unreadable' });
          continue;
        }

        if (!this.isValidBackfillAnalysis(analysis)) {
          unreadableCount += 1;
          failedItems.push({ ...item, reason: 'image-unreadable' });
          continue;
        }

        try {
          const outcome = await this.garmentService.backfillTagsFromAi(
            garment.id,
            targetUserId,
            analysis,
          );
          analyzedThisRun += 1;
          mirrorConflictCount += outcome.mirrorConflictCount;
          if (outcome.changed) {
            filledGarmentCount += 1;
            filledFieldCount += outcome.addedFieldCount;
          } else {
            unchangedCount += 1;
          }
        } catch {
          failedCount += 1;
          failedItems.push({ ...item, reason: 'database-error' });
        }
      }

      const remainingUnattempted =
        await this.remainingPendingCount(targetUserId);
      const completionState = this.completionState({
        remainingUnattempted,
        unreadableCount,
        failedCount,
        noPhotoCount: noPhotoItems.length,
      });

      return {
        targetUserId,
        requestedLimit,
        effectiveLimit,
        total: garments.length,
        withPhoto: withPhoto.length,
        attemptedThisRun,
        analyzedThisRun,
        filledGarmentCount,
        filledFieldCount,
        unchangedCount,
        unreadableCount,
        failedCount,
        mirrorConflictCount,
        noPhotoCount: noPhotoItems.length,
        remainingUnattempted,
        completionState,
        deadlineReached,
        noPhotoItems: noPhotoItems.slice(0, BACKFILL_NO_PHOTO_ITEMS_MAX),
        ...(noPhotoItems.length > BACKFILL_NO_PHOTO_ITEMS_MAX
          ? { noPhotoItemsTruncated: true }
          : {}),
        failedItems,
      };
    } finally {
      this.activeBackfillUserIds.delete(targetUserId);
    }
  }

  private async assertAdmin(userId?: number): Promise<void> {
    if (!(await this.isAdmin(userId))) {
      throw new ForbiddenException('只有管理员可以访问库存导出');
    }
  }

  private hasQwenApiKey(): boolean {
    return Boolean(this.configService.get<string>('QWEN_API_KEY')?.trim());
  }

  private effectiveBackfillLimit(requestedLimit: number): number {
    const maxByBudget = Math.floor(
      (BACKFILL_TIME_BUDGET_MS - BACKFILL_TIME_RESERVE_MS) /
        this.visionTimeoutMs(),
    );
    const effectiveLimit = Math.min(
      requestedLimit,
      BACKFILL_LIMIT_MAX,
      maxByBudget,
    );
    if (effectiveLimit < 1) {
      throw new ServiceUnavailableException(
        'AI 请求超时时间过长，请检查 AI_VISION_TIMEOUT_MS',
      );
    }
    return effectiveLimit;
  }

  private visionTimeoutMs(): number {
    const configured = Number(
      this.configService.get<string>('AI_VISION_TIMEOUT_MS'),
    );
    return Number.isFinite(configured) && configured > 0 ? configured : 25_000;
  }

  private hasPhoto(garment: Garment): boolean {
    return Boolean(garment.photo?.fileName?.trim());
  }

  private itemSummary(garment: Garment): { id: number; name: string } {
    return {
      id: garment.id,
      name: garment.name?.trim() || `衣物 #${garment.id}`,
    };
  }

  private isValidBackfillAnalysis(
    analysis: unknown,
  ): analysis is GarmentVisionResult {
    if (!analysis || typeof analysis !== 'object') return false;
    const result = analysis as Partial<GarmentVisionResult>;
    return (
      typeof result.confidence === 'number' &&
      Number.isFinite(result.confidence) &&
      result.confidence > 0 &&
      Boolean(result.taxonomyTags) &&
      typeof result.taxonomyTags === 'object' &&
      !Array.isArray(result.taxonomyTags) &&
      Object.entries(result.taxonomyTags).every(
        ([group, values]) =>
          Object.prototype.hasOwnProperty.call(GARMENT_TAG_TAXONOMY, group) &&
          Array.isArray(values) &&
          values.every((value) => typeof value === 'string'),
      ) &&
      Array.isArray(result.seasons) &&
      result.seasons.every((value) => typeof value === 'string') &&
      Array.isArray(result.styleTags) &&
      result.styleTags.every((value) => typeof value === 'string') &&
      Array.isArray(result.sceneTags) &&
      result.sceneTags.every((value) => typeof value === 'string')
    );
  }

  private async remainingPendingCount(targetUserId: number): Promise<number> {
    const latestGarments = await this.garmentRepository.find(
      { owner: { id: targetUserId } },
      { populate: ['photo'], orderBy: { id: 'ASC' } },
    );
    return latestGarments.filter(
      (garment) => this.hasPhoto(garment) && !garment.tagsBackfilledAt,
    ).length;
  }

  private completionState(input: {
    remainingUnattempted: number;
    unreadableCount: number;
    failedCount: number;
    noPhotoCount: number;
  }): MiniappGarmentTagBackfillResult['completionState'] {
    if (input.unreadableCount > 0 || input.failedCount > 0) {
      return 'needs-retry';
    }
    if (input.remainingUnattempted > 0) return 'has-more';
    return input.noPhotoCount > 0
      ? 'photo-complete-with-no-photo'
      : 'photo-complete';
  }

  private configValues(key: string): Set<string> {
    const raw = this.configService.get<string>(key) ?? '';
    return new Set(
      raw
        .split(/[,，\s]+/)
        .map((value) => value.trim())
        .filter(Boolean),
    );
  }

  private displayName(user: User): string {
    return (
      user.nickname ||
      user.email ||
      this.maskOpenId(user.wechatOpenId) ||
      `用户 #${user.id}`
    );
  }

  private maskOpenId(openId?: string): string {
    if (!openId) return '';
    if (openId.length <= 8) return openId;
    return `${openId.slice(0, 4)}...${openId.slice(-4)}`;
  }
}
