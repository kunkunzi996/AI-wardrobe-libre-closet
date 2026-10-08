import {
  EntityManager,
  UniqueConstraintViolationException,
} from '@mikro-orm/core';
import {
  BadRequestException,
  ForbiddenException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  GarmentImageService,
  type GeneratedImageResult,
  type GarmentImageFamily,
} from '../ai/garment-image.service';
import { GarmentImageNormalization } from '../dal/entity/garment-image-normalization.entity';
import { File } from '../dal/entity/file.entity';
import { randomUUID } from 'node:crypto';
import { FileService } from '../file/file-service.abstract';
import { garmentImageFamily } from './garment-image-category';
import { GarmentService, type StoredGarmentPhotoRef } from './garment.service';
import type {
  NormalizationView,
  NormalizationWorkItem,
  NormalizationDownloadWorkItem,
  OwnedGarmentPhoto,
} from './dto/garment-image-normalization.dto';

/** Ref 在 Owner 是文件快照，包内是条目引用，恢复时是目标 File ID。 */
export interface NormalizationTransferSnapshot<Ref = StoredGarmentPhotoRef> {
  status: 'queued' | 'processing' | 'uncertain' | 'ready' | 'failed';
  promptFamily: string;
  promptVersion: string;
  model: string;
  sourcePhotoRef: Ref;
  candidatePhotoRef?: Ref;
}

@Injectable()
export class GarmentImageNormalizationService {
  constructor(
    private readonly em: EntityManager,
    private readonly garments: GarmentService,
    private readonly images: GarmentImageService,
    private readonly files: FileService,
  ) {}

  private async owned(id: number, userId: number | undefined) {
    if (!userId || !Number.isSafeInteger(userId) || userId <= 0)
      throw new UnauthorizedException('请登录后整理');
    return this.garments.findOne(id, userId);
  }

  async get(
    id: number,
    userId: number | undefined,
    origin = '',
  ): Promise<NormalizationView> {
    const garment = await this.owned(id, userId);
    const record = await this.em
      .fork()
      .findOne(
        GarmentImageNormalization,
        { garment: id },
        { populate: ['candidatePhoto'] },
      );
    const family = record
      ? (record.promptFamily as GarmentImageFamily)
      : garmentImageFamily(garment);
    const available = Boolean(
      garment.originalPhoto &&
        garment.photo &&
        family &&
        this.images.isConfigured(),
    );
    const status = record?.status ?? 'idle';
    const candidate = record?.candidatePhoto;
    const adopted = Boolean(candidate && garment.photo?.id === candidate.id);
    const messages = {
      idle: !garment.originalPhoto
        ? '缺少上传原图，不能整理'
        : !family
          ? '当前类别不支持整理'
          : !available
            ? 'AI 整理服务暂未开启'
            : '',
      queued: '整理任务已受理，请稍后查看',
      processing: '整理中，退出后可继续查看',
      uncertain: '结果待确认，可能已产生本次费用，请查看原次处理状态',
      ready: adopted ? '已采用整理图' : '整理图已生成，请先核对再采用',
      failed: '本次整理失败，当前展示图未改变',
    };
    return {
      attemptKey: record?.attemptKey ?? null,
      status,
      family,
      message: messages[status],
      originalPhotoUrl: garment.originalPhoto
        ? `${origin}/api/miniapp/garments/${id}/photos/original?v=${garment.originalPhoto.id}`
        : '',
      candidatePhotoUrl: candidate
        ? `${origin}/api/miniapp/garments/${id}/photos/candidate?v=${candidate.id}`
        : '',
      adopted,
      canStart: available && (status === 'idle' || status === 'failed'),
      canAdopt: status === 'ready' && Boolean(candidate) && !adopted,
    };
  }

  async start(
    id: number,
    userId: number | undefined,
    attemptKey: unknown,
    origin = '',
  ) {
    const garment = await this.owned(id, userId);
    if (
      typeof attemptKey !== 'string' ||
      !/^[A-Za-z0-9_-]{8,200}$/.test(attemptKey)
    )
      throw new BadRequestException('本次整理标识无效');
    const family = garmentImageFamily(garment);
    if (
      !family ||
      !garment.originalPhoto ||
      !garment.photo ||
      !this.images.isConfigured()
    )
      throw new BadRequestException('原图、类别或生成配置不满足整理条件');
    try {
      await this.em.fork().transactional(async (tx) => {
        const existing = await tx.findOne(GarmentImageNormalization, {
          garment: id,
        });
        if (existing) {
          // 只保留当前记录，用客户端单调时间标识拦住所有旧次重放。
          const nextTime = this.attemptTime(attemptKey);
          if (
            existing.status !== 'failed' ||
            attemptKey === existing.attemptKey ||
            nextTime <= this.attemptTime(existing.attemptKey)
          )
            return;
          await tx.nativeUpdate(
            GarmentImageNormalization,
            {
              id: existing.id,
              status: 'failed',
              attemptKey: existing.attemptKey,
            },
            {
              attemptKey,
              status: 'queued',
              sourcePhoto: garment.photo!.id,
              promptFamily: family,
              promptVersion: this.images.promptVersion,
              model: this.images.model,
              candidatePhoto: null,
              providerRequestId: null,
              resultUrl: null,
              errorCode: null,
              dispatchedAt: null,
              updatedAt: new Date(),
            },
          );
          return;
        }
        tx.create(GarmentImageNormalization, {
          garment: id,
          attemptKey,
          status: 'queued',
          sourcePhoto: garment.photo!.id,
          promptFamily: family,
          promptVersion: this.images.promptVersion,
          model: this.images.model,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        await tx.flush();
      });
    } catch (error) {
      // 唯一 garment 记录是跨请求的防线，而不是仅依赖按钮/进程内锁。
      if (!(error instanceof UniqueConstraintViolationException)) throw error;
    }
    return this.get(id, userId, origin);
  }

  async claimQueued(): Promise<NormalizationWorkItem | null> {
    const em = this.em.fork();
    const record = await em.findOne(
      GarmentImageNormalization,
      { status: 'queued' },
      { populate: ['garment.owner', 'sourcePhoto'], orderBy: { id: 'ASC' } },
    );
    if (!record) return null;
    const claimed = await em.nativeUpdate(
      GarmentImageNormalization,
      { id: record.id, attemptKey: record.attemptKey, status: 'queued' },
      { status: 'processing', dispatchedAt: new Date(), updatedAt: new Date() },
    );
    if (claimed !== 1) return null;
    return this.workItem(record);
  }

  private attemptTime(key: string): number {
    const prefix = /^([a-z0-9]+)_/.exec(key)?.[1];
    const value = prefix ? Number.parseInt(prefix, 36) : 0;
    return Number.isSafeInteger(value) && value > 0 ? value : 0;
  }

  private workItem(record: GarmentImageNormalization): NormalizationWorkItem {
    return {
      recordId: record.id,
      attemptKey: record.attemptKey,
      garmentId: record.garment.id,
      ownerId: record.garment.getEntity().owner!.id,
      sourceFileName: record.sourcePhoto.getEntity().fileName,
      family: record.promptFamily as GarmentImageFamily,
    };
  }

  /** 已派发不再回到 queued；未保存完整响应的次只能保守待确认。 */
  async recoverDispatched(): Promise<void> {
    await this.em.fork().nativeUpdate(
      GarmentImageNormalization,
      { status: 'processing' },
      {
        status: 'uncertain',
        errorCode: 'PROCESS_INTERRUPTED',
        updatedAt: new Date(),
      },
    );
  }

  /** 只领取本次已有的下载地址，不领取或再次派发图像生成。 */
  async claimResultDownloads(): Promise<NormalizationDownloadWorkItem[]> {
    const em = this.em.fork();
    const records = await em.find(
      GarmentImageNormalization,
      { status: 'uncertain', resultUrl: { $ne: null }, candidatePhoto: null },
      { populate: ['garment.owner', 'sourcePhoto'], orderBy: { id: 'ASC' } },
    );
    const claimed: NormalizationDownloadWorkItem[] = [];
    for (const record of records) {
      const count = await em.nativeUpdate(
        GarmentImageNormalization,
        {
          id: record.id,
          attemptKey: record.attemptKey,
          status: 'uncertain',
          resultUrl: record.resultUrl,
        },
        { status: 'processing', updatedAt: new Date() },
      );
      if (count === 1)
        claimed.push({
          ...this.workItem(record),
          resultUrl: record.resultUrl!,
        });
    }
    return claimed;
  }

  async saveProviderResult(
    work: NormalizationWorkItem,
    result: GeneratedImageResult,
  ): Promise<boolean> {
    return (
      (await this.em.fork().nativeUpdate(
        GarmentImageNormalization,
        {
          id: work.recordId,
          attemptKey: work.attemptKey,
          status: { $in: ['processing', 'uncertain'] },
          resultUrl: null,
        },
        {
          providerRequestId: result.requestId,
          resultUrl: result.imageUrl,
          updatedAt: new Date(),
        },
      )) === 1
    );
  }

  async completeCandidate(
    work: NormalizationWorkItem,
    candidateFileId: number,
  ): Promise<boolean> {
    const em = this.em.fork();
    const file = await em.findOne(File, {
      id: candidateFileId,
      createdBy: work.ownerId,
    });
    if (!file) throw new ForbiddenException();
    return (
      (await em.nativeUpdate(
        GarmentImageNormalization,
        {
          id: work.recordId,
          attemptKey: work.attemptKey,
          status: { $in: ['processing', 'uncertain'] },
          candidatePhoto: null,
        },
        {
          candidatePhoto: file.id,
          status: 'ready',
          errorCode: null,
          updatedAt: new Date(),
        },
      )) === 1
    );
  }

  async markFailed(work: NormalizationWorkItem, code: string) {
    return this.mark(work, 'failed', code);
  }
  async markUncertain(work: NormalizationWorkItem, code: string) {
    return this.mark(work, 'uncertain', code);
  }
  private async mark(
    work: NormalizationWorkItem,
    status: 'failed' | 'uncertain',
    code: string,
  ) {
    return this.em.fork().nativeUpdate(
      GarmentImageNormalization,
      {
        id: work.recordId,
        attemptKey: work.attemptKey,
        status: 'processing',
      },
      { status, errorCode: code, updatedAt: new Date() },
    );
  }

  async exportSnapshot(
    id: number,
    userId: number,
  ): Promise<NormalizationTransferSnapshot | null> {
    await this.owned(id, userId);
    const record = await this.em
      .fork()
      .findOne(
        GarmentImageNormalization,
        { garment: id },
        { populate: ['sourcePhoto', 'candidatePhoto'] },
      );
    if (!record) return null;
    const ref = (file: File): StoredGarmentPhotoRef => {
      if (file.createdBy?.id !== userId) throw new ForbiddenException();
      return { id: file.id, fileName: file.fileName, mimetype: file.mimetype };
    };
    return {
      status: record.status,
      promptFamily: record.promptFamily,
      promptVersion: record.promptVersion,
      model: record.model,
      sourcePhotoRef: ref(record.sourcePhoto.getEntity()),
      candidatePhotoRef: record.candidatePhoto
        ? ref(record.candidatePhoto.getEntity())
        : undefined,
    };
  }

  async restoreSnapshot(
    id: number,
    userId: number,
    snapshot: NormalizationTransferSnapshot<number>,
  ): Promise<void> {
    await this.owned(id, userId);
    const em = this.em.fork();
    if (await em.findOne(GarmentImageNormalization, { garment: id }))
      throw new ConflictException('目标已存在整理记录');
    const source = await em.findOne(File, {
      id: snapshot.sourcePhotoRef,
      createdBy: userId,
    });
    const candidate = snapshot.candidatePhotoRef
      ? await em.findOne(File, {
          id: snapshot.candidatePhotoRef,
          createdBy: userId,
        })
      : undefined;
    if (!source || (snapshot.candidatePhotoRef && !candidate))
      throw new ForbiddenException('图片不属于目标主人');
    // 只恢复静态本地结果，绝不携带原派发 key、供应商凭证或 URL。
    const status =
      snapshot.status === 'ready' && candidate
        ? 'ready'
        : snapshot.status === 'failed'
          ? 'failed'
          : 'uncertain';
    const record = em.create(GarmentImageNormalization, {
      garment: id,
      attemptKey: Date.now().toString(36) + '_' + randomUUID(),
      status,
      sourcePhoto: source.id,
      candidatePhoto: candidate?.id,
      promptFamily: snapshot.promptFamily,
      promptVersion: snapshot.promptVersion,
      model: snapshot.model,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await em.persistAndFlush(record);
  }

  async adopt(id: number, userId: number | undefined, attemptKey: unknown) {
    await this.owned(id, userId);
    const record = await this.em
      .fork()
      .findOne(
        GarmentImageNormalization,
        { garment: id },
        { populate: ['candidatePhoto'] },
      );
    if (
      !record ||
      record.status !== 'ready' ||
      record.attemptKey !== attemptKey ||
      !record.candidatePhoto
    )
      throw new ConflictException('候选已失效或还未完成，请重新查看');
    return this.garments.adoptNormalizedPhoto(
      id,
      userId!,
      record.candidatePhoto.id,
      record.sourcePhoto.id,
    );
  }

  async getCandidate(
    id: number,
    userId: number | undefined,
    version: string | undefined,
  ): Promise<OwnedGarmentPhoto> {
    await this.owned(id, userId);
    const record = await this.em
      .fork()
      .findOne(
        GarmentImageNormalization,
        { garment: id, status: 'ready' },
        { populate: ['candidatePhoto'] },
      );
    const file = record?.candidatePhoto?.getEntity();
    if (!file || typeof version !== 'string' || version !== String(file.id))
      throw new NotFoundException('图片不存在或版本已失效');
    if (file.createdBy?.id !== userId) throw new ForbiddenException();
    const stream = await this.files.get(file.fileName);
    if (!stream) throw new NotFoundException('图片不存在');
    return { stream, mimetype: file.mimetype ?? 'image/png' };
  }
}
