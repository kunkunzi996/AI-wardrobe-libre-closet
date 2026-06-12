import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { MultipartFile } from '@fastify/multipart';
import type { FastifyRequest } from 'fastify';
import { GarmentVisionService } from '../ai/garment-vision.service';
import type { GarmentVisionResult } from '../ai/dto/garment-vision-result.dto';
import { ConditionalAuthGuard } from '../auth/conditional-auth.guard';
import type { Payload } from '../auth/dto/payload.dto';
import type { Garment } from '../dal/entity/garment.entity';
import { GarmentColor } from './garment-color.enum';
import { GarmentStatus } from './garment-status.enum';
import { GarmentService } from './garment.service';

type MiniappRequest = FastifyRequest & {
  protocol?: string;
  host?: string;
};

type MiniappCreateBody = {
  name?: string;
  category?: string;
  color?: GarmentColor;
  season?: string;
  brand?: string;
  size?: string;
  notes?: string;
};

@UseGuards(ConditionalAuthGuard)
@Controller('api/miniapp/garments')
export class MiniappWardrobeController {
  constructor(
    private readonly garmentService: GarmentService,
    private readonly garmentVisionService: GarmentVisionService,
  ) {}

  @Get()
  async index(@Req() req: MiniappRequest) {
    const garments = await this.garmentService.findAll(this.userId(req), {});
    return { items: garments.map((garment) => this.toViewModel(garment, req)) };
  }

  @Get(':id')
  async show(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: MiniappRequest,
  ) {
    const garment = await this.garmentService.findOne(id, this.userId(req));
    return { item: this.toViewModel(garment, req) };
  }

  @Post()
  async create(@Body() body: MiniappCreateBody = {}, @Req() req: MiniappRequest) {
    const photo = await this.readImageUpload(req);
    const form = this.mergeMultipartFields(body, photo);

    if (!form.category) {
      throw new BadRequestException('分类不能为空');
    }

    const garment = await this.garmentService.create(
      {
        name: form.name,
        category: form.category,
        color: form.color,
        seasons: form.season,
        brand: form.brand,
        size: form.size,
        notes: form.notes,
        photo,
      },
      this.userId(req),
    );

    const analyzedGarment = await this.applyAiTags(garment, form, req);
    return { item: this.toViewModel(analyzedGarment, req) };
  }

  @Delete(':id')
  @HttpCode(200)
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: MiniappRequest,
  ) {
    await this.garmentService.remove(id, this.userId(req));
    return { ok: true };
  }

  private userId(req: FastifyRequest): number | undefined {
    return (req['user'] as Payload | undefined)?.userId;
  }

  private async readImageUpload(
    req: MiniappRequest,
  ): Promise<MultipartFile> {
    const file = await req.file?.();
    if (!file) {
      throw new BadRequestException('请先选择图片');
    }
    if (!file.mimetype?.startsWith('image/')) {
      throw new BadRequestException('上传文件必须是图片');
    }
    return file;
  }

  private mergeMultipartFields(
    body: MiniappCreateBody = {},
    file: MultipartFile,
  ): MiniappCreateBody {
    return {
      name: this.fieldValue(body.name, file, 'name'),
      category: this.fieldValue(body.category, file, 'category'),
      color: this.fieldValue(body.color, file, 'color') as
        | GarmentColor
        | undefined,
      season: this.fieldValue(body.season, file, 'season'),
      brand: this.fieldValue(body.brand, file, 'brand'),
      size: this.fieldValue(body.size, file, 'size'),
      notes: this.fieldValue(body.notes, file, 'notes'),
    };
  }

  private fieldValue(
    bodyValue: string | undefined,
    file: MultipartFile,
    name: string,
  ): string | undefined {
    const value =
      bodyValue ??
      (file.fields?.[name] as { value?: unknown } | undefined)?.value;
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
  }

  private async applyAiTags(
    garment: Garment,
    form: MiniappCreateBody,
    req: MiniappRequest,
  ): Promise<Garment> {
    const photoFileName = garment.photo?.fileName;
    if (!photoFileName) return garment;

    const ai = await this.garmentVisionService.analyzeImage(photoFileName);
    if (!this.hasUsefulAiResult(ai)) return garment;

    return this.garmentService.update(
      garment.id,
      {
        name: form.name || ai.subcategory || garment.name,
        category: ai.category,
        color: ai.color,
        seasons: ai.seasons,
        styleTags: ai.styleTags,
        sceneTags: ai.sceneTags,
        material: ai.material,
        thickness: ai.thickness,
        notes: this.mergeNotes(form.notes, ai),
      },
      this.userId(req),
    );
  }

  private hasUsefulAiResult(ai: GarmentVisionResult): boolean {
    return ai.confidence > 0;
  }

  private mergeNotes(
    notes: string | undefined,
    ai: GarmentVisionResult,
  ): string | undefined {
    const parts = [notes, ai.notes].filter(Boolean);
    return parts.length ? parts.join('\n') : undefined;
  }

  private toViewModel(garment: Garment, req: MiniappRequest) {
    const photoFileName = garment.photo?.fileName;
    return {
      id: garment.id,
      name: garment.name ?? '',
      category: garment.category,
      categoryLabel: this.categoryLabel(garment.category),
      color: garment.color ?? '',
      colorLabel: this.colorLabel(garment.color),
      status: garment.status,
      statusLabel: this.statusLabel(garment.status),
      season: garment.seasons?.[0] ?? '',
      seasons: garment.seasons ?? [],
      subcategory: garment.subcategory ?? '',
      styleTags: garment.styleTags ?? [],
      sceneTags: garment.sceneTags ?? [],
      material: garment.material ?? '',
      thickness: garment.thickness ?? '',
      brand: garment.brand ?? '',
      size: garment.size ?? '',
      notes: garment.notes ?? '',
      photoUrl: photoFileName ? `${this.origin(req)}/file/${photoFileName}` : '',
      detailUrl: `/api/miniapp/garments/${garment.id}`,
    };
  }

  private origin(req: MiniappRequest): string {
    const protocol = req.protocol ?? 'https';
    const host = req.host ?? req.headers.host ?? 'aimatchwear.asia';
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

  private statusLabel(status?: string): string {
    const labels: Record<string, string> = {
      wearable: '可穿',
      laundry: '待洗',
      stored: '收纳中',
      damaged: '需修补',
      archived: '已归档',
    };
    return status ? labels[status] ?? status : '';
  }
}
