import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { ConditionalAuthGuard } from '../auth/conditional-auth.guard';
import type { Payload } from '../auth/dto/payload.dto';
import type { Garment } from '../dal/entity/garment.entity';
import type { OutfitCalendar } from '../dal/entity/outfit-calendar.entity';
import type { Outfit } from '../dal/entity/outfit.entity';
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
  garmentIds?: Array<number | string>;
};

@UseGuards(ConditionalAuthGuard)
@Controller('api/miniapp/daily-outfits')
export class MiniappDailyOutfitController {
  constructor(
    private readonly garmentService: GarmentService,
    private readonly outfitService: OutfitService,
    private readonly calendarService: CalendarService,
  ) {}

  @Get('today')
  async today(@Query('date') date: string | undefined, @Req() req: MiniappRequest) {
    const targetDate = this.parseDate(date);
    const schedule = await this.calendarService.findWeek(
      targetDate,
      this.userId(req),
    );
    const dateKey = this.toDateKey(targetDate);
    const day = schedule.days.find((item) => this.toDateKey(item.date) === dateKey);

    return {
      date: dateKey,
      items: (day?.entries ?? []).map((entry) => this.toCalendarItem(entry, req)),
    };
  }

  @Post()
  async save(@Body() body: SaveDailyOutfitBody, @Req() req: MiniappRequest) {
    const garmentIds = this.normalizeGarmentIds(body.garmentIds);
    if (!garmentIds.length) {
      throw new BadRequestException('请先选择一套搭配');
    }

    const allGarments = await this.garmentService.findAll(this.userId(req), {});
    const garmentById = new Map(allGarments.map((garment) => [garment.id, garment]));
    const selectedGarments = garmentIds
      .map((id) => garmentById.get(id))
      .filter((garment): garment is Garment => Boolean(garment));

    if (selectedGarments.length !== garmentIds.length) {
      throw new BadRequestException('有衣物不存在，请重新生成搭配');
    }

    const outfit = await this.outfitService.create(
      {
        name: body.title?.trim() || '今日穿搭',
        notes: body.notes?.trim() || body.reason?.trim(),
        slots: selectedGarments.map((garment) => ({
          category: garment.category,
          garmentId: garment.id,
        })),
      },
      this.userId(req),
    );
    const entry = await this.calendarService.create(
      {
        date: this.parseDate(body.date),
        outfitId: outfit.id,
        notes: body.reason?.trim(),
      },
      this.userId(req),
    );

    return {
      item: this.toCalendarItem(entry, req, outfit),
    };
  }

  private userId(req: FastifyRequest): number | undefined {
    return (req['user'] as Payload | undefined)?.userId;
  }

  private normalizeGarmentIds(input?: Array<number | string>): number[] {
    const ids = (input ?? [])
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value));
    return Array.from(new Set(ids));
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
      outfit: {
        id: outfit.id,
        name: outfit.name ?? '今日穿搭',
        notes: outfit.notes ?? '',
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
      photoUrl: photoFileName ? `${this.origin(req)}/file/${photoFileName}` : '',
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
    return color ? labels[color] ?? color : '';
  }
}
