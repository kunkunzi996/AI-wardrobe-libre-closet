import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { MultipartFile } from '@fastify/multipart';
import type { FastifyRequest } from 'fastify';
import { ConditionalAuthGuard } from '../auth/conditional-auth.guard';
import type { Payload } from '../auth/dto/payload.dto';
import type { Garment } from '../dal/entity/garment.entity';
import type { OutfitCalendar } from '../dal/entity/outfit-calendar.entity';
import type { Outfit } from '../dal/entity/outfit.entity';
import { FileService } from '../file/file-service.abstract';
import { CalendarService } from './calendar.service';
import { GarmentService } from './garment.service';
import { OutfitService } from './outfit.service';

type MiniappRequest = FastifyRequest & {
  protocol?: string;
  host?: string;
};

type SaveDailyOutfitBody = {
  date?: string;
  title?: string;
  reason?: string;
  notes?: string;
  scene?: string;
  rating?: number | string;
  feedback?: string;
  garmentIds?: Array<number | string> | string;
};

@UseGuards(ConditionalAuthGuard)
@Controller('api/miniapp/daily-outfits')
export class MiniappDailyOutfitController {
  constructor(
    private readonly garmentService: GarmentService,
    private readonly outfitService: OutfitService,
    private readonly calendarService: CalendarService,
    private readonly fileService: FileService,
  ) {}

  @Get('today')
  async today(
    @Query('date') date: string | undefined,
    @Req() req: MiniappRequest,
  ) {
    const targetDate = this.parseDate(date);
    const schedule = await this.calendarService.findWeek(
      targetDate,
      this.userId(req),
    );
    const dateKey = this.toDateKey(targetDate);
    const day = schedule.days.find(
      (item) => this.toDateKey(item.date) === dateKey,
    );

    return {
      date: dateKey,
      items: (day?.entries ?? []).map((entry) =>
        this.toCalendarItem(entry, req),
      ),
    };
  }

  @Get(':id/detail')
  async detail(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: MiniappRequest,
  ) {
    const entry = await this.calendarService.findOwnedEntry(
      id,
      this.userId(req),
    );
    return {
      item: this.toCalendarItem(entry, req),
    };
  }

  @Post()
  async save(
    @Body() body: SaveDailyOutfitBody = {},
    @Req() req: MiniappRequest,
  ) {
    const file = await this.readImageUpload(req);
    const form = this.mergeMultipartFields(body, file);
    const garmentIds = this.normalizeGarmentIds(form.garmentIds);

    const allGarments = await this.garmentService.findAll(this.userId(req), {});
    const garmentById = new Map(
      allGarments.map((garment) => [garment.id, garment]),
    );
    const selectedGarments = garmentIds
      .map((id) => garmentById.get(id))
      .filter((garment): garment is Garment => Boolean(garment));

    if (selectedGarments.length !== garmentIds.length) {
      throw new BadRequestException('有衣物不存在，请重新生成搭配');
    }

    const photo = await this.fileService.storeOriginalImageFromFileUpload(
      file,
      this.userId(req),
    );
    const outfit = await this.outfitService.create(
      {
        name: form.title?.trim() || '今日穿搭',
        notes: form.notes?.trim() || form.reason?.trim(),
        photoFileName: photo.fileName,
        slots: selectedGarments.map((garment) => ({
          category: garment.category,
          garmentId: garment.id,
        })),
      },
      this.userId(req),
    );
    const entry = await this.calendarService.create(
      {
        date: this.parseDate(form.date),
        outfitId: outfit.id,
        notes: form.reason?.trim(),
        scene: form.scene?.trim(),
        rating: form.rating,
        feedback: form.feedback?.trim(),
      },
      this.userId(req),
    );

    return {
      item: this.toCalendarItem(entry, req, outfit),
    };
  }

  @Delete(':id')
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: MiniappRequest,
  ) {
    const userId = this.userId(req);

    const entry = await this.calendarService.findOwnedEntry(id, userId);
    const outfit = entry.outfit?.unwrap();
    const outfitId = outfit?.id;
    const photoId = outfit?.photo?.id;

    await this.calendarService.remove(id, userId);

    if (outfitId != null) {
      const stillUsed = await this.calendarService.countByOutfit(outfitId);
      if (stillUsed === 0) {
        await this.outfitService.remove(outfitId, userId);
        if (photoId != null) {
          try {
            await this.fileService.deleteById(photoId, userId);
          } catch {
            // The calendar entry and outfit are already removed; photo cleanup is best-effort.
          }
        }
      }
    }

    return { ok: true };
  }

  @Patch(':id')
  @Post(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: SaveDailyOutfitBody = {},
    @Req() req: MiniappRequest,
  ) {
    const userId = this.userId(req);

    let newPhoto: Awaited<
      ReturnType<FileService['storeOriginalImageFromFileUpload']>
    > | null = null;
    let uploadFile: MultipartFile | undefined;
    try {
      uploadFile = await req.file?.();
      if (uploadFile && uploadFile.mimetype?.startsWith('image/')) {
        newPhoto = await this.fileService.storeOriginalImageFromFileUpload(
          uploadFile,
          userId,
        );
      } else if (uploadFile) {
        uploadFile.file.resume();
      }
    } catch {
      // No new photo was uploaded; keep the original outfit photo.
    }

    const form = this.mergeMultipartFields(body, uploadFile ?? ({} as any));
    const shouldUpdateGarments = form.garmentIds !== undefined;
    const garmentIds = this.normalizeGarmentIds(form.garmentIds);

    const entry = await this.calendarService.findOwnedEntry(id, userId);
    const outfit = entry.outfit?.unwrap();
    if (!outfit) throw new BadRequestException('Outfit not found');

    const outfitUpdate: Parameters<OutfitService['update']>[1] = {};
    if (form.title || form.reason || form.notes) {
      outfitUpdate.name = form.title?.trim() || outfit.name;
      outfitUpdate.notes =
        form.notes?.trim() || form.reason?.trim() || outfit.notes;
    }

    if (shouldUpdateGarments) {
      const allGarments = await this.garmentService.findAll(userId, {});
      const garmentById = new Map(
        allGarments.map((garment) => [garment.id, garment]),
      );
      const selectedGarments = garmentIds
        .map((gid) => garmentById.get(gid))
        .filter((garment): garment is Garment => Boolean(garment));

      if (selectedGarments.length !== garmentIds.length) {
        throw new BadRequestException('有衣物不存在，请重新选择');
      }

      outfitUpdate.slots = selectedGarments.map((garment) => ({
        category: garment.category,
        garmentId: garment.id,
      }));
    }

    if (Object.keys(outfitUpdate).length > 0) {
      await this.outfitService.update(outfit.id, outfitUpdate, userId);
    }

    if (newPhoto) {
      outfit.photo = newPhoto;
      await (this.outfitService as any).outfitRepository
        .getEntityManager()
        .flush();
    }

    await this.calendarService.update(
      id,
      {
        scene: form.scene?.trim(),
        rating: form.rating,
        feedback: form.feedback?.trim(),
        notes: form.reason?.trim(),
      },
      userId,
    );

    const updated = await this.calendarService.findOwnedEntry(id, userId);
    return {
      item: this.toCalendarItem(updated, req),
    };
  }

  private userId(req: FastifyRequest): number | undefined {
    return (req['user'] as Payload | undefined)?.userId;
  }

  private async readImageUpload(req: MiniappRequest): Promise<MultipartFile> {
    const file = await req.file?.();
    if (!file) {
      throw new BadRequestException('请先选择穿搭照片');
    }
    if (!file.mimetype?.startsWith('image/')) {
      file.file.resume();
      throw new BadRequestException('上传文件必须是图片');
    }
    return file;
  }

  private mergeMultipartFields(
    body: SaveDailyOutfitBody,
    file: MultipartFile,
  ): SaveDailyOutfitBody {
    return {
      date: this.fieldValue(body.date, file, 'date'),
      title: this.fieldValue(body.title, file, 'title'),
      reason: this.fieldValue(body.reason, file, 'reason'),
      notes: this.fieldValue(body.notes, file, 'notes'),
      scene: this.fieldValue(body.scene, file, 'scene'),
      rating: this.fieldValue(body.rating, file, 'rating'),
      feedback: this.fieldValue(body.feedback, file, 'feedback'),
      garmentIds:
        this.fieldValue(body.garmentIds, file, 'garmentIds') ?? body.garmentIds,
    };
  }

  private fieldValue(
    bodyValue: string | number | Array<string | number> | undefined,
    file: MultipartFile,
    name: string,
  ): string | undefined {
    if (Array.isArray(bodyValue)) return undefined;
    const value =
      bodyValue ??
      (file.fields?.[name] as { value?: unknown } | undefined)?.value;
    if (typeof value === 'number') return String(value);
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
  }

  private normalizeGarmentIds(
    input?: Array<number | string> | string,
  ): number[] {
    const rawValues = Array.isArray(input)
      ? input
      : this.parseGarmentIdsString(input);
    const ids = rawValues
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value));
    return Array.from(new Set(ids));
  }

  private parseGarmentIdsString(input?: string): Array<number | string> {
    if (!input) return [];
    try {
      const parsed = JSON.parse(input);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // Fall back to comma-separated form for older clients or manual tests.
    }
    return input.split(',').map((item) => item.trim());
  }

  private parseDate(input?: string): Date {
    if (!input) return this.todayDate();
    const parsed = new Date(`${input}T00:00:00.000Z`);
    return Number.isNaN(parsed.getTime()) ? this.todayDate() : parsed;
  }

  private todayDate(): Date {
    const now = new Date();
    return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  }

  private toDateKey(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  private toCalendarItem(
    entry: OutfitCalendar,
    req: MiniappRequest,
    createdOutfit?: Outfit,
  ) {
    const outfit = createdOutfit ?? entry.outfit.unwrap();
    const garments = outfit.garments.getItems();
    return {
      id: entry.id,
      date: this.toDateKey(entry.date),
      notes: entry.notes ?? outfit.notes ?? '',
      scene: entry.scene ?? '',
      rating: entry.rating ?? '',
      feedback: entry.feedback ?? '',
      outfit: {
        id: outfit.id,
        name: outfit.name ?? '今日穿搭',
        notes: outfit.notes ?? '',
        photoUrl: outfit.photo?.fileName
          ? `${this.origin(req)}/file/${outfit.photo.fileName}`
          : '',
        garments: garments.map((garment) => this.toGarmentCard(garment, req)),
      },
    };
  }

  private toGarmentCard(garment: Garment, req: MiniappRequest) {
    const photoFileName = garment.photo?.fileName;
    return {
      id: garment.id,
      name: garment.name ?? '',
      category: garment.category,
      categoryLabel: this.categoryLabel(garment.category),
      color: garment.color ?? '',
      colorLabel: this.colorLabel(garment.color),
      photoUrl: photoFileName
        ? `${this.origin(req)}/file/${photoFileName}`
        : '',
    };
  }

  private origin(req: MiniappRequest): string {
    const forwardedProto = req.headers?.['x-forwarded-proto'];
    const protocol =
      (Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto) ??
      req.protocol ??
      'https';
    const host = req.host ?? req.headers?.host ?? 'aimatchwear.asia';
    return `${protocol}://${host}`;
  }

  private categoryLabel(category: string): string {
    const labels: Record<string, string> = {
      accessories: '配饰',
      bags: '包包',
      outerwear: '外套',
      dresses: '连衣裙',
      tops: '上衣',
      bottoms: '下装',
      footwear: '鞋子',
      other: '其他',
    };
    return labels[category] ?? category;
  }

  private colorLabel(color?: string): string {
    const labels: Record<string, string> = {
      red: '红色',
      pink: '粉色',
      orange: '橙色',
      yellow: '黄色',
      green: '绿色',
      blue: '蓝色',
      purple: '紫色',
      black: '黑色',
      white: '白色',
      grey: '灰色',
      beige: '米色',
      brown: '棕色',
      gold: '金色',
      silver: '银色',
      pattern: '图案',
      other: '其他',
    };
    return color ? (labels[color] ?? color) : '';
  }
}
