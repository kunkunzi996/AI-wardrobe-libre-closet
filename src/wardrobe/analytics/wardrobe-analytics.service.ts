import { EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Injectable } from '@nestjs/common';
import { Garment } from '../../dal/entity/garment.entity';
import { GarmentStatus } from '../garment-status.enum';

export interface DistributionItem {
  label: string;
  count: number;
}

export interface WardrobeAnalyticsResult {
  summary: {
    total: number;
    wearable: number;
    laundry: number;
    longUnworn: number;
  };
  mostWorn: Garment[];
  lowUsage: Garment[];
  longUnworn: Garment[];
  colorDistribution: DistributionItem[];
  styleDistribution: DistributionItem[];
  advice: string[];
}

@Injectable()
export class WardrobeAnalyticsService {
  constructor(
    @InjectRepository(Garment)
    private readonly garmentRepository: EntityRepository<Garment>,
  ) {}

  async analyze(
    userId?: number,
    now: Date = new Date(),
  ): Promise<WardrobeAnalyticsResult> {
    const garments = await this.garmentRepository.find(
      userId != null ? { owner: { id: userId } } : { owner: null },
      { orderBy: { id: 'DESC' } },
    );
    const longUnworn = this.findLongUnworn(garments, now);

    return {
      summary: {
        total: garments.length,
        wearable: garments.filter((g) => g.status === GarmentStatus.Wearable)
          .length,
        laundry: garments.filter((g) => g.status === GarmentStatus.Laundry)
          .length,
        longUnworn: longUnworn.length,
      },
      mostWorn: [...garments]
        .filter((g) => (g.wearCount ?? 0) > 0)
        .sort((a, b) => (b.wearCount ?? 0) - (a.wearCount ?? 0))
        .slice(0, 5),
      lowUsage: garments
        .filter((g) => g.status === GarmentStatus.Wearable)
        .filter((g) => (g.wearCount ?? 0) <= 1)
        .sort((a, b) => (a.wearCount ?? 0) - (b.wearCount ?? 0))
        .slice(0, 5),
      longUnworn,
      colorDistribution: this.distribution(garments.map((g) => g.color)),
      styleDistribution: this.distribution(garments.flatMap((g) => g.styleTags ?? [])),
      advice: this.buildAdvice(garments),
    };
  }

  private findLongUnworn(garments: Garment[], now: Date): Garment[] {
    const ninetyDays = 90 * 24 * 60 * 60 * 1000;
    return garments
      .filter((g) => g.status === GarmentStatus.Wearable)
      .filter((g) => {
        if (!g.lastWornDate) return true;
        return now.getTime() - g.lastWornDate.getTime() > ninetyDays;
      })
      .sort(
        (a, b) =>
          (a.lastWornDate?.getTime() ?? Number.MAX_SAFE_INTEGER) -
          (b.lastWornDate?.getTime() ?? Number.MAX_SAFE_INTEGER),
      )
      .slice(0, 5);
  }

  private distribution(values: Array<string | undefined>): DistributionItem[] {
    const counts = new Map<string, number>();
    for (const value of values) {
      if (!value) continue;
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  }

  private buildAdvice(garments: Garment[]): string[] {
    const advice: string[] = [];
    const countByCategory = new Map<string, number>();
    for (const garment of garments) {
      countByCategory.set(
        garment.category,
        (countByCategory.get(garment.category) ?? 0) + 1,
      );
    }

    if ((countByCategory.get('bottoms') ?? 0) < 2) {
      advice.push('下装数量较少，可以后续考虑补一件适合春秋的基础下装。');
    }
    if ((countByCategory.get('outerwear') ?? 0) < 2) {
      advice.push('外套数量偏少，可以后续考虑补一件不同厚薄的外套。');
    }
    if (!advice.length) {
      advice.push('衣橱结构已经比较均衡，先观察真实穿着记录再决定是否补充。');
    }
    return advice;
  }
}
