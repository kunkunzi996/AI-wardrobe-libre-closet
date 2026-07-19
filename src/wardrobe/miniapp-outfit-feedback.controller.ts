import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import ExcelJS from 'exceljs';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { ConditionalAuthGuard } from '../auth/conditional-auth.guard';
import type { Garment } from '../dal/entity/garment.entity';
import type { Payload } from '../auth/dto/payload.dto';
import type { OutfitFeedback } from '../dal/entity/outfit-feedback.entity';
import { OutfitFeedbackService } from './outfit-feedback.service';

const VALID_RATINGS = ['good', 'soso', 'bad'] as const;
const MAX_COMMENT_LENGTH = 500;

type SaveFeedbackBody = {
  rating?: string;
  comment?: string;
  requestText?: string;
  planTitle?: string;
  planReason?: string;
  garmentIds?: Array<number | string>;
  source?: string;
  coreGarmentId?: number | string;
};

@UseGuards(ConditionalAuthGuard)
@Controller('api/miniapp/outfit-feedback')
export class MiniappOutfitFeedbackController {
  constructor(private readonly outfitFeedbackService: OutfitFeedbackService) {}

  @Post()
  async save(@Body() body: SaveFeedbackBody = {}, @Req() req: FastifyRequest) {
    const rating = typeof body.rating === 'string' ? body.rating.trim() : '';
    if (!VALID_RATINGS.includes(rating as (typeof VALID_RATINGS)[number])) {
      throw new BadRequestException('请先选择一个评价选项');
    }

    const comment = typeof body.comment === 'string' ? body.comment.trim() : '';
    if (comment.length > MAX_COMMENT_LENGTH) {
      throw new BadRequestException(`文字反馈最多 ${MAX_COMMENT_LENGTH} 个字`);
    }

    const feedback = await this.outfitFeedbackService.create(
      {
        rating,
        comment: comment || undefined,
        requestText: this.stringOrUndefined(body.requestText),
        planTitle: this.stringOrUndefined(body.planTitle),
        planReason: this.stringOrUndefined(body.planReason),
        garmentIds: this.normalizeGarmentIds(body.garmentIds),
        source: this.stringOrUndefined(body.source),
        coreGarmentId: this.numberOrUndefined(body.coreGarmentId),
      },
      this.userId(req),
    );

    return { item: this.toItem(feedback) };
  }

  @Get('export')
  async export(@Req() req: FastifyRequest) {
    const items = await this.outfitFeedbackService.findAll(this.userId(req));
    return { items: items.map((feedback) => this.toItem(feedback)) };
  }

  @Get('export.xlsx')
  async exportExcel(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    const items = await this.outfitFeedbackService.findAll(this.userId(req));
    const garmentLookup = await this.outfitFeedbackService.findGarmentLookup(
      this.userId(req),
      this.collectFeedbackGarmentIds(items),
    );

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('搭配反馈');
    sheet.columns = [
      { header: '时间（北京时间）', key: 'createdAt', width: 22 },
      { header: '评价', key: 'ratingLabel', width: 12 },
      { header: '文字反馈', key: 'comment', width: 40 },
      { header: '需求语句', key: 'requestText', width: 28 },
      { header: '方案标题', key: 'planTitle', width: 20 },
      { header: '方案理由', key: 'planReason', width: 40 },
      { header: '衣物ID列表', key: 'garmentIds', width: 16 },
      { header: '核心衣物对照', key: 'coreGarmentLabel', width: 34 },
      { header: '衣物ID对照', key: 'garmentLabels', width: 48 },
      { header: '推荐来源', key: 'sourceLabel', width: 12 },
    ];
    sheet.getRow(1).font = { bold: true };

    for (const feedback of items) {
      sheet.addRow({
        createdAt: this.toBeijingTime(feedback.createdAt),
        ratingLabel: this.ratingLabel(feedback.rating),
        comment: feedback.comment ?? '',
        requestText: feedback.requestText ?? '',
        planTitle: feedback.planTitle ?? '',
        planReason: feedback.planReason ?? '',
        garmentIds: (feedback.garmentIds ?? []).join(', '),
        coreGarmentLabel: this.describeGarmentId(
          feedback.coreGarmentId,
          garmentLookup,
        ),
        garmentLabels: (feedback.garmentIds ?? [])
          .map((id) => this.describeGarmentId(id, garmentLookup))
          .join('\n'),
        sourceLabel: this.sourceLabel(feedback.source),
      });
    }

    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    const fileName = `outfit-feedback-${new Date().toISOString().slice(0, 10)}.xlsx`;
    reply.header(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    reply.header('Content-Disposition', `attachment; filename="${fileName}"`);
    return reply.send(buffer);
  }

  private userId(req: FastifyRequest): number | undefined {
    return (req['user'] as Payload | undefined)?.userId;
  }

  private stringOrUndefined(value?: string): string | undefined {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
  }

  private numberOrUndefined(value: number | string | undefined) {
    if (value == null || value === '') return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  private normalizeGarmentIds(
    input?: Array<number | string>,
  ): number[] | undefined {
    if (!Array.isArray(input)) return undefined;
    const ids = input
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value));
    return ids.length ? Array.from(new Set(ids)) : undefined;
  }

  private toItem(feedback: OutfitFeedback) {
    return {
      id: feedback.id,
      createdAt: feedback.createdAt?.toISOString() ?? '',
      rating: feedback.rating,
      ratingLabel: this.ratingLabel(feedback.rating),
      comment: feedback.comment ?? '',
      requestText: feedback.requestText ?? '',
      planTitle: feedback.planTitle ?? '',
      planReason: feedback.planReason ?? '',
      garmentIds: feedback.garmentIds ?? [],
      source: feedback.source ?? '',
      coreGarmentId: feedback.coreGarmentId ?? null,
    };
  }

  private collectFeedbackGarmentIds(items: OutfitFeedback[]): number[] {
    return items.flatMap((feedback) => [
      ...(feedback.garmentIds ?? []),
      ...(feedback.coreGarmentId ? [feedback.coreGarmentId] : []),
    ]);
  }

  private describeGarmentId(
    id: number | undefined | null,
    garmentLookup: Map<number, Garment>,
  ): string {
    if (id == null) return '';
    const garment = garmentLookup.get(id);
    if (!garment) return `#${id}（未找到，可能已删除）`;
    const parts = [
      garment.name,
      garment.subcategory,
      this.categoryLabel(garment.category),
      this.colorLabel(garment.color),
      garment.brand,
      garment.size,
    ]
      .map((value) => value?.trim())
      .filter(Boolean);
    return `#${id} ${parts.join(' / ')}`;
  }

  private ratingLabel(rating: string): string {
    const labels: Record<string, string> = {
      good: '搭配得不错',
      soso: '一般',
      bad: '不喜欢',
    };
    return labels[rating] ?? rating;
  }

  private sourceLabel(source?: string): string {
    const labels: Record<string, string> = {
      ai: 'AI生成',
      fallback: '规则兜底',
    };
    return source ? (labels[source] ?? source) : '';
  }

  private categoryLabel(category?: string): string {
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
    return category ? (labels[category] ?? category) : '';
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

  private toBeijingTime(date?: Date): string {
    if (!date) return '';
    const beijing = new Date(date.getTime() + 8 * 60 * 60 * 1000);
    return beijing.toISOString().slice(0, 19).replace('T', ' ');
  }
}
