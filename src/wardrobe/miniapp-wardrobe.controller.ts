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
  constructor(private readonly garmentService: GarmentService) {}

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
  async create(@Body() body: MiniappCreateBody, @Req() req: MiniappRequest) {
    if (!body.category) {
      throw new BadRequestException('分类不能为空');
    }

    const photo = await this.readImageUpload(req);
    const garment = await this.garmentService.create(
      {
        name: body.name,
        category: body.category,
        color: body.color,
        seasons: body.season,
        brand: body.brand,
        size: body.size,
        notes: body.notes,
        photo,
      },
      this.userId(req),
    );
    return { item: this.toViewModel(garment, req) };
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
  ): Promise<MultipartFile | undefined> {
    const file = await req.file?.();
    if (!file) {
      throw new BadRequestException('请先选择图片');
    }
    if (!file.mimetype?.startsWith('image/')) {
      throw new BadRequestException('上传文件必须是图片');
    }
    return file;
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
