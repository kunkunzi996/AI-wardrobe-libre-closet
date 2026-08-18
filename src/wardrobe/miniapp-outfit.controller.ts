import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { ConditionalAuthGuard } from '../auth/conditional-auth.guard';
import type { Payload } from '../auth/dto/payload.dto';
import type { Garment } from '../dal/entity/garment.entity';
import { GarmentStatus } from './garment-status.enum';
import { GarmentService } from './garment.service';
import { OutfitGeneratorService } from './recommendation/outfit-generator.service';
import { MiniappOutfitRecommendDto } from './dto/miniapp-outfit-recommend.dto';
import {
  TencentWeatherService,
  type WeatherRequestInput,
} from '../weather/tencent-weather.service';

type MiniappAiRecommendation = {
  title: string;
  reason: string;
  cautions: string[];
  garments: Garment[];
};

type MiniappRequest = FastifyRequest & {
  protocol?: string;
  host?: string;
};

@UseGuards(ConditionalAuthGuard)
@Controller('api/miniapp/outfits')
export class MiniappOutfitController {
  constructor(
    private readonly garmentService: GarmentService,
    private readonly outfitGeneratorService: OutfitGeneratorService,
    private readonly weatherService: TencentWeatherService,
  ) {}

  @Get('ready')
  async ready(@Req() req: MiniappRequest) {
    const garments = await this.garmentService.findAll(this.userId(req), {});
    const wearable = garments.filter(
      (garment) => garment.status === GarmentStatus.Wearable,
    );
    return {
      ready: garments.length > 0,
      garmentCount: garments.length,
      wearableCount: wearable.length,
    };
  }

  @Post('recommend')
  async recommend(
    @Body() body: MiniappOutfitRecommendDto,
    @Req() req: MiniappRequest,
  ) {
    // 客户端没带天气字段，说明的是「这次没有实时温度」，不是「换一套推荐规则」：
    // 缺省归一为 unavailable 后仍走小程序规则；字段存在但格式非法才是参数错误。
    const weatherRequest: WeatherRequestInput =
      body.weather == null
        ? { mode: 'unavailable' }
        : this.weatherRequest(body.weather);
    const temperatureContext =
      await this.weatherService.getContext(weatherRequest);
    const result = await this.outfitGeneratorService.generateWithAi({
      mode: 'miniapp-taxonomy-v1',
      coreGarmentId: this.numberOrUndefined(body.coreGarmentId),
      requestText: body.requestText || '帮我从衣橱里搭配一套今天可以穿的衣服',
      userId: this.userId(req),
      temperatureContext,
    });
    const aiRecommendations =
      (result.ai?.recommendations as MiniappAiRecommendation[] | undefined) ??
      [];
    const plans = aiRecommendations.length
      ? aiRecommendations.map((recommendation) => ({
          title: recommendation.title,
          reason: recommendation.reason,
          cautions: recommendation.cautions,
          garments: recommendation.garments.map((garment) =>
            this.toGarmentCard(garment, req),
          ),
        }))
      : result.plans.map((plan) => ({
          title: plan.title,
          reason: plan.reason,
          cautions: plan.cautions,
          garments: plan.garments.map((garment) =>
            this.toGarmentCard(garment, req),
          ),
        }));

    return {
      source: result.ai?.source ?? 'fallback',
      message: result.ai?.message,
      recommendations: plans,
      weather: temperatureContext,
    };
  }

  private userId(req: FastifyRequest): number | undefined {
    return (req['user'] as Payload | undefined)?.userId;
  }

  private numberOrUndefined(value: number | string | undefined) {
    if (value == null || value === '') return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
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
      status: garment.status,
      statusLabel: this.statusLabel(garment.status),
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

  private statusLabel(status: GarmentStatus): string {
    const labels: Record<GarmentStatus, string> = {
      [GarmentStatus.Wearable]: '可穿',
      [GarmentStatus.Laundry]: '待洗',
      [GarmentStatus.Stored]: '收纳中',
      [GarmentStatus.Damaged]: '需修补',
      [GarmentStatus.Archived]: '已归档',
    };
    return labels[status];
  }

  private weatherRequest(value: unknown): WeatherRequestInput {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new BadRequestException('天气请求格式不正确');
    }

    const weather = value as Record<string, unknown>;
    if (weather.mode === 'unavailable') {
      return { mode: 'unavailable' };
    }
    if (weather.mode === 'manual') {
      const city = typeof weather.city === 'string' ? weather.city.trim() : '';
      if (!city) throw new BadRequestException('手动城市不能为空');
      return { mode: 'manual', city };
    }
    if (weather.mode === 'auto') {
      const latitude = weather.latitude;
      const longitude = weather.longitude;
      if (
        typeof latitude !== 'number' ||
        !Number.isFinite(latitude) ||
        latitude < -90 ||
        latitude > 90 ||
        typeof longitude !== 'number' ||
        !Number.isFinite(longitude) ||
        longitude < -180 ||
        longitude > 180
      ) {
        throw new BadRequestException('自动天气需要有效坐标');
      }
      return { mode: 'auto', latitude, longitude };
    }

    throw new BadRequestException('不支持的天气模式');
  }
}
