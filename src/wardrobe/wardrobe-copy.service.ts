import { EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Garment } from '../dal/entity/garment.entity';
import { Outfit } from '../dal/entity/outfit.entity';
import { OutfitCalendar } from '../dal/entity/outfit-calendar.entity';
import { OutfitFeedback } from '../dal/entity/outfit-feedback.entity';
import { User } from '../dal/entity/user.entity';
import { FileService } from '../file/file-service.abstract';
import { CalendarService } from './calendar.service';
import { GarmentService } from './garment.service';
import { MiniappAdminService } from './miniapp-admin.service';
import { OutfitFeedbackService } from './outfit-feedback.service';
import { OutfitService } from './outfit.service';

export type WardrobeCopyCounts = {
  sourceUserId: number;
  targetUserId: number;
  sourceGarmentCount: number;
  sourcePhotoCount: number;
  sourceOutfitCount: number;
  sourceCalendarCount: number;
  sourceFeedbackCount: number;
  overwrite?: boolean;
};

@Injectable()
export class WardrobeCopyService {
  constructor(
    private readonly adminService: MiniappAdminService,
    private readonly garmentService: GarmentService,
    private readonly outfitService: OutfitService,
    private readonly calendarService: CalendarService,
    private readonly feedbackService: OutfitFeedbackService,
    private readonly fileService: FileService,
    @InjectRepository(User)
    private readonly userRepository: EntityRepository<User>,
    @InjectRepository(Garment)
    private readonly garmentRepository: EntityRepository<Garment>,
    @InjectRepository(Outfit)
    private readonly outfitRepository: EntityRepository<Outfit>,
    @InjectRepository(OutfitCalendar)
    private readonly calendarRepository: EntityRepository<OutfitCalendar>,
    @InjectRepository(OutfitFeedback)
    private readonly feedbackRepository: EntityRepository<OutfitFeedback>,
  ) {}

  async preview(adminUserId: number | undefined, sourceUserId: number, targetUserId: number) {
    await this.assertAdmin(adminUserId);
    const source = await this.requireUser(sourceUserId);
    const target = await this.requireUser(targetUserId);
    const sourceItems = await this.loadOwned(sourceUserId);
    const targetItems = await this.loadOwned(targetUserId);
    return {
      source: {
        id: source.id,
        displayName: this.displayName(source),
        ...this.toCounts(sourceItems),
      },
      target: {
        id: target.id,
        displayName: this.displayName(target),
        acceptanceSandbox: Boolean(target.acceptanceSandbox),
        ...this.toCounts(targetItems),
      },
    };
  }

  async copy(adminUserId: number | undefined, input: WardrobeCopyCounts) {
    await this.assertAdmin(adminUserId);
    if (input.sourceUserId === input.targetUserId) {
      throw new BadRequestException('源和目标不能是同一个衣橱主人');
    }

    const target = await this.requireUser(input.targetUserId);
    if (!target.acceptanceSandbox) {
      throw new BadRequestException('只能写入已标记的验收沙盒');
    }

    const sourceItems = await this.loadOwned(input.sourceUserId);
    const actual = this.toCounts(sourceItems);
    if (
      actual.garmentCount !== input.sourceGarmentCount ||
      actual.photoCount !== input.sourcePhotoCount ||
      actual.outfitCount !== input.sourceOutfitCount ||
      actual.calendarCount !== input.sourceCalendarCount ||
      actual.feedbackCount !== input.sourceFeedbackCount
    ) {
      throw new BadRequestException('确认件数与当前源衣橱不一致');
    }

    const targetItems = await this.loadOwned(input.targetUserId);
    const targetCounts = this.toCounts(targetItems);
    const targetNotEmpty =
      targetCounts.garmentCount +
        targetCounts.outfitCount +
        targetCounts.calendarCount +
        targetCounts.feedbackCount >
      0;
    if (targetNotEmpty && !input.overwrite) {
      throw new BadRequestException('目标沙盒已有副本，需要确认覆盖');
    }

    if (input.overwrite && targetNotEmpty) {
      await this.clearOwned(input.targetUserId, targetItems);
    }

    const garmentIdMap = new Map<number, number>();
    for (const garment of sourceItems.garments) {
      const photoName = garment.photo?.fileName?.trim();
      const copiedPhoto = photoName
        ? await this.fileService.copyStoredFile(photoName, input.targetUserId)
        : undefined;
      const created = await this.garmentService.create(
        {
          name: garment.name,
          category: garment.category,
          subcategory: garment.subcategory,
          brand: garment.brand,
          color: garment.color,
          size: garment.size,
          seasons: garment.seasons,
          styleTags: garment.styleTags,
          sceneTags: garment.sceneTags,
          material: garment.material,
          thickness: garment.thickness,
          pocketPresence: garment.pocketPresence,
          pocketPosition: garment.pocketPosition,
          chestMarkPresence: garment.chestMarkPresence,
          chestMarkType: garment.chestMarkType,
          chestMarkPosition: garment.chestMarkPosition,
          chestMarkText: garment.chestMarkText,
          fit: garment.fit,
          taxonomyTags: garment.taxonomyTags,
          status: garment.status,
          price: garment.price,
          purchaseDate: garment.purchaseDate,
          purchaseChannel: garment.purchaseChannel,
          wearCount: garment.wearCount,
          lastWornDate: garment.lastWornDate,
          notes: garment.notes,
          photoFileName: copiedPhoto?.fileName,
        },
        input.targetUserId,
      );
      garmentIdMap.set(garment.id, created.id);
    }

    const outfitIdMap = new Map<number, number>();
    for (const outfit of sourceItems.outfits) {
      const slots = (outfit.slots ?? []).map((slot) => ({
        category: slot.category,
        garmentId:
          slot.garmentId == null
            ? null
            : (garmentIdMap.get(slot.garmentId) ?? null),
      }));
      const created = await this.outfitService.create(
        {
          name: outfit.name,
          notes: outfit.notes,
          slots,
          photoFileName: outfit.photo?.fileName,
        },
        input.targetUserId,
      );
      outfitIdMap.set(outfit.id, created.id);
    }

    for (const entry of sourceItems.calendars) {
      const sourceOutfitId = Number((entry.outfit as { id?: number })?.id);
      const resolvedOutfitId = outfitIdMap.get(sourceOutfitId);
      if (resolvedOutfitId == null) {
        throw new BadRequestException('今日穿搭无法对上新的搭配');
      }
      await this.calendarService.create(
        {
          date: entry.date,
          outfitId: resolvedOutfitId,
          scene: entry.scene,
          weather: entry.weather,
          temperature: entry.temperature,
          rating: entry.rating,
          feedback: entry.feedback,
          complimented: entry.complimented,
          notes: entry.notes,
        },
        input.targetUserId,
      );
    }

    for (const item of sourceItems.feedback) {
      await this.feedbackService.create(
        {
          rating: item.rating,
          comment: item.comment,
          requestText: item.requestText,
          planTitle: item.planTitle,
          planReason: item.planReason,
          garmentIds: (item.garmentIds ?? []).map(
            (id) => garmentIdMap.get(id) ?? id,
          ),
          source: item.source,
          coreGarmentId:
            item.coreGarmentId == null
              ? undefined
              : (garmentIdMap.get(item.coreGarmentId) ?? item.coreGarmentId),
        },
        input.targetUserId,
      );
    }

    const copied = {
      garments: garmentIdMap.size,
      photos: sourceItems.garments.filter((garment) =>
        Boolean(garment.photo?.fileName?.trim()),
      ).length,
      outfits: outfitIdMap.size,
      calendars: sourceItems.calendars.length,
      feedback: sourceItems.feedback.length,
    };

    return {
      complete:
        copied.garments === actual.garmentCount &&
        copied.photos === actual.photoCount &&
        copied.outfits === actual.outfitCount &&
        copied.calendars === actual.calendarCount &&
        copied.feedback === actual.feedbackCount,
      copied,
    };
  }

  private async assertAdmin(userId?: number): Promise<void> {
    if (!(await this.adminService.isAdmin(userId))) {
      throw new ForbiddenException('只有管理员可以复制衣橱');
    }
  }

  private async clearOwned(
    userId: number,
    items: {
      garments: Garment[];
      outfits: Outfit[];
      calendars: OutfitCalendar[];
      feedback: OutfitFeedback[];
    },
  ): Promise<void> {
    for (const entry of items.calendars) {
      await this.calendarService.remove(entry.id, userId);
    }
    for (const outfit of items.outfits) {
      await this.outfitService.remove(outfit.id, userId);
    }
    const feedbackWhere = { owner: { id: userId } };
    await this.feedbackRepository.nativeDelete(feedbackWhere);
    for (const garment of items.garments) {
      await this.garmentService.remove(garment.id, userId);
    }
  }

  private async requireUser(userId: number): Promise<User> {
    const user = await this.userRepository.findOne(userId);
    if (!user) throw new NotFoundException('用户不存在');
    return user;
  }

  private async loadOwned(userId: number) {
    const where = { owner: { id: userId } };
    const [garments, outfits, calendars, feedback] = await Promise.all([
      this.garmentRepository.find(where, { populate: ['photo'] }),
      this.outfitRepository.find(where, { populate: ['photo'] }),
      this.calendarRepository.find(where, { populate: ['outfit'] }),
      this.feedbackRepository.find(where),
    ]);
    return { garments, outfits, calendars, feedback };
  }

  private toCounts(items: {
    garments: Garment[];
    outfits: Outfit[];
    calendars: OutfitCalendar[];
    feedback: OutfitFeedback[];
  }) {
    return {
      garmentCount: items.garments.length,
      photoCount: items.garments.filter((garment) =>
        Boolean(garment.photo?.fileName?.trim()),
      ).length,
      outfitCount: items.outfits.length,
      calendarCount: items.calendars.length,
      feedbackCount: items.feedback.length,
    };
  }

  private displayName(user: User): string {
    return user.nickname || user.email || `用户 #${user.id}`;
  }
}
