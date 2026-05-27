import { EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Injectable } from '@nestjs/common';
import { Garment } from '../../dal/entity/garment.entity';
import { GarmentStatus } from '../garment-status.enum';
import { OutfitAiResult, OutfitAiService } from '../../ai/outfit-ai.service';
import {
  parseWardrobeQuery,
  WardrobeQueryIntent,
} from './wardrobe-query-parser';

export interface ScoredGarment {
  garment: Garment;
  score: number;
  reasons: string[];
}

export interface GarmentRecommendationGroup {
  category: string;
  garments: ScoredGarment[];
}

export interface ExcludedGarment {
  garment: Garment;
  reason: 'not_wearable' | 'excluded_category';
}

export interface WardrobeRecommendationResult {
  query: string;
  intent: WardrobeQueryIntent;
  ai?: OutfitAiResult;
  groups: GarmentRecommendationGroup[];
  excluded: ExcludedGarment[];
}

@Injectable()
export class WardrobeRecommendationService {
  constructor(
    @InjectRepository(Garment)
    private readonly garmentRepository: EntityRepository<Garment>,
    private readonly outfitAiService?: OutfitAiService,
  ) {}

  async recommend(
    userId: number | undefined,
    query: string,
  ): Promise<WardrobeRecommendationResult> {
    const intent = parseWardrobeQuery(query);
    const garments = await this.garmentRepository.find(
      userId != null ? { owner: { id: userId } } : { owner: null },
      { populate: ['photo'], orderBy: { id: 'DESC' } },
    );
    const excluded: ExcludedGarment[] = [];
    const scored: ScoredGarment[] = [];

    for (const garment of garments) {
      if (garment.status !== GarmentStatus.Wearable) {
        excluded.push({ garment, reason: 'not_wearable' });
        continue;
      }
      if (intent.excludedCategories.includes(garment.category)) {
        excluded.push({ garment, reason: 'excluded_category' });
        continue;
      }
      scored.push(this.scoreGarment(garment, intent));
    }

    scored.sort((a, b) => b.score - a.score || b.garment.id - a.garment.id);

    return {
      query,
      intent,
      ai: this.outfitAiService
        ? await this.outfitAiService.recommend({
            requestText: query,
            availableGarments: garments.map((garment) => ({
              id: garment.id,
              name: garment.name,
              category: garment.category,
              color: garment.color,
              seasons: garment.seasons,
              styleTags: garment.styleTags,
              sceneTags: garment.sceneTags,
              status: garment.status,
            })),
          })
        : undefined,
      groups: this.groupByCategory(scored),
      excluded,
    };
  }

  private scoreGarment(
    garment: Garment,
    intent: WardrobeQueryIntent,
  ): ScoredGarment {
    let score = 0;
    const reasons: string[] = [];

    if (garment.color && intent.colors.includes(garment.color)) {
      score += 4;
      reasons.push('颜色匹配');
    }

    for (const style of intent.styles) {
      if (this.hasText(garment.styleTags, style)) {
        score += 3;
        reasons.push(`风格匹配：${style}`);
      }
    }

    for (const scene of intent.scenes) {
      if (this.hasText(garment.sceneTags, scene)) {
        score += 3;
        reasons.push(`场景匹配：${scene}`);
      }
    }

    for (const season of intent.seasons) {
      if (this.hasText(garment.seasons, season)) {
        score += 2;
        reasons.push(`季节匹配：${season}`);
      }
    }

    for (const keyword of intent.keywords) {
      if (this.matchesKeyword(garment, keyword)) {
        score += 1;
        reasons.push(`关键词：${keyword}`);
      }
    }

    if (reasons.length === 0) reasons.push('可穿衣物');
    return { garment, score, reasons };
  }

  private groupByCategory(scored: ScoredGarment[]): GarmentRecommendationGroup[] {
    const groups = new Map<string, ScoredGarment[]>();
    for (const item of scored) {
      const list = groups.get(item.garment.category) ?? [];
      list.push(item);
      groups.set(item.garment.category, list);
    }
    return Array.from(groups.entries()).map(([category, garments]) => ({
      category,
      garments,
    }));
  }

  private hasText(values: string[] | undefined, expected: string): boolean {
    const needle = expected.trim().toLowerCase();
    return Boolean(
      needle && values?.some((value) => value.toLowerCase().includes(needle)),
    );
  }

  private matchesKeyword(garment: Garment, keyword: string): boolean {
    const needle = keyword.trim().toLowerCase();
    const values = [
      garment.name,
      garment.category,
      garment.subcategory,
      garment.brand,
      garment.material,
      garment.thickness,
      garment.fit,
      garment.notes,
      ...(garment.seasons ?? []),
      ...(garment.styleTags ?? []),
      ...(garment.sceneTags ?? []),
    ];
    return values.some((value) => value?.toLowerCase().includes(needle));
  }
}
