import { Controller, Get, Req, Render, UseGuards } from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { ConditionalAuthGuard } from '../auth/conditional-auth.guard';
import { Payload } from '../auth/dto/payload.dto';
import { WardrobeAnalyticsService } from './analytics/wardrobe-analytics.service';

@UseGuards(ConditionalAuthGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: WardrobeAnalyticsService) {}

  private userId(req: FastifyRequest): number | undefined {
    return (req['user'] as Payload | undefined)?.userId;
  }

  @Get()
  @Render('analytics/index')
  async index(@Req() req: FastifyRequest) {
    const analytics = await this.analyticsService.analyze(this.userId(req));
    return { analytics };
  }
}
