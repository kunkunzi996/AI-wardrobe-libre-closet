import { EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Injectable, NotFoundException } from '@nestjs/common';
import { Garment } from '../../dal/entity/garment.entity';
import { OutfitSlot } from '../../dal/entity/outfit.entity';
import { GarmentStatus } from '../garment-status.enum';
import { OutfitAiResult, OutfitAiService } from '../../ai/outfit-ai.service';

export interface GenerateOutfitInput {
  coreGarmentId: number;
  requestText?: string;
  userId?: number;
}

export interface GeneratedOutfitPlan {
  title: string;
  reason: string;
  garments: Garment[];
  slots: OutfitSlot[];
}

export interface GeneratedOutfitResult {
  plans: GeneratedOutfitPlan[];
  ai?: OutfitAiResult & {
    recommendations: Array<
      OutfitAiResult['recommendations'][number] & { garments: Garment[] }
    >;
  };
}

const PLAN_TITLES = [
  '方案A：稳妥通勤',
  '方案B：年轻活泼',
  '方案C：舒适日常',
];

const COMPLEMENTARY_CATEGORIES: Record<string, string[]> = {
  tops: ['bottoms', 'footwear', 'outerwear', 'bags', 'accessories'],
  outerwear: ['tops', 'bottoms', 'footwear', 'bags', 'accessories'],
  bottoms: ['tops', 'footwear', 'outerwear', 'bags', 'accessories'],
  dresses: ['footwear', 'outerwear', 'bags', 'accessories'],
  footwear: ['tops', 'bottoms', 'outerwear', 'bags', 'accessories'],
  bags: ['tops', 'bottoms', 'footwear', 'outerwear', 'accessories'],
  accessories: ['tops', 'bottoms', 'footwear', 'outerwear', 'bags'],
  other: ['tops', 'bottoms', 'footwear', 'bags', 'accessories'],
};

@Injectable()
export class OutfitGeneratorService {
  constructor(
    @InjectRepository(Garment)
    private readonly garmentRepository: EntityRepository<Garment>,
    private readonly outfitAiService?: OutfitAiService,
  ) {}

  async generate(input: GenerateOutfitInput): Promise<GeneratedOutfitPlan[]> {
    const result = await this.generateWithAi(input);
    return result.plans;
  }

  async generateWithAi(input: GenerateOutfitInput): Promise<GeneratedOutfitResult> {
    const garments = await this.garmentRepository.find(
      input.userId != null
        ? { owner: { id: input.userId } }
        : { owner: null },
      { populate: ['photo'], orderBy: { id: 'DESC' } },
    );
    const wearable = garments.filter(
      (garment) => garment.status === GarmentStatus.Wearable,
    );
    const core = wearable.find((garment) => garment.id === input.coreGarmentId);
    if (!core) throw new NotFoundException('Core garment not found');

    const plans = PLAN_TITLES.map((title, index) => {
      const selected = this.pickGarments(core, wearable, input.requestText, index);
      return {
        title,
        reason: this.reasonFor(title, core, input.requestText),
        garments: selected,
        slots: selected.map((garment) => ({
          category: garment.category,
          garmentId: garment.id,
        })),
      };
    });

    const rawAi = this.outfitAiService
      ? await this.outfitAiService.recommend({
          requestText: input.requestText || core.name || '围绕这件衣服搭配',
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
      : undefined;

    const ai = rawAi
      ? this.attachAiGarments(rawAi, garments, input.requestText, core)
      : undefined;

    return { plans, ai };
  }

  private pickGarments(
    core: Garment,
    garments: Garment[],
    requestText: string | undefined,
    planIndex: number,
  ): Garment[] {
    const selected = new Map<number, Garment>();
    selected.set(core.id, core);
    const categories = this.complementaryCategoriesFor(core);

    for (const category of categories) {
      if (category === core.category) continue;
      const candidates = garments
        .filter((garment) => garment.category === category)
        .filter(
          (garment) =>
            !this.isIncompatibleWithRequest(garment, requestText, core),
        );
      const picked = this.pickOne(candidates, core, requestText, planIndex);
      if (picked) selected.set(picked.id, picked);
    }

    return Array.from(selected.values());
  }

  private pickOne(
    candidates: Garment[],
    core: Garment,
    requestText: string | undefined,
    planIndex: number,
  ): Garment | undefined {
    if (!candidates.length) return undefined;
    const scored = candidates
      .map((garment) => ({
        garment,
        score: this.scoreCandidate(garment, core, requestText),
      }))
      .sort((a, b) => b.score - a.score || b.garment.id - a.garment.id);
    return scored[planIndex % scored.length]?.garment;
  }

  private scoreCandidate(
    garment: Garment,
    core: Garment,
    requestText: string | undefined,
  ): number {
    let score = 0;
    if (garment.color === core.color) score += 2;
    if (this.isEasyColorPair(garment.color, core.color)) score += 1;
    if (this.overlaps(garment.sceneTags, core.sceneTags)) score += 3;
    if (this.overlaps(garment.styleTags, core.styleTags)) score += 2;
    if (this.overlaps(garment.seasons, core.seasons)) score += 1;
    if (requestText && this.matchesRequest(garment, requestText)) score += 2;
    return score;
  }

  private attachAiGarments(
    ai: OutfitAiResult,
    garments: Garment[],
    requestText?: string,
    core?: Garment,
  ): GeneratedOutfitResult['ai'] {
    const garmentById = new Map(garments.map((garment) => [garment.id, garment]));
    return {
      ...ai,
      recommendations: ai.recommendations.map((recommendation) => {
        const recommendationGarments = recommendation.garmentIds
          .map((id) => garmentById.get(id))
          .filter((garment): garment is Garment => Boolean(garment))
          .filter(
            (garment) =>
              !this.isIncompatibleWithRequest(garment, requestText, core),
          );
        if (
          core &&
          !recommendationGarments.some((garment) => garment.id === core.id)
        ) {
          recommendationGarments.unshift(core);
        }
        return {
          ...recommendation,
          garmentIds: recommendationGarments.map((garment) => garment.id),
          garments: recommendationGarments,
        };
      }),
    };
  }

  private isIncompatibleWithRequest(
    garment: Garment,
    requestText: string | undefined,
    core?: Garment,
  ): boolean {
    if (core && garment.id === core.id) return false;
    if (!this.isHotWeatherRequest(requestText)) return false;

    const searchable = [
      garment.name,
      garment.category,
      garment.subcategory,
      garment.material,
      garment.thickness,
      garment.fit,
      ...(garment.seasons ?? []),
      ...(garment.styleTags ?? []),
      ...(garment.sceneTags ?? []),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    if (garment.category === 'outerwear') return true;
    return [
      'winter',
      'thick',
      'warm',
      'puffer',
      'coat',
      'parka',
      'sweater',
      'turtleneck',
      'scarf',
      '羽绒',
      '大衣',
      '外套',
      '毛衣',
      '高领',
      '围巾',
      '保暖',
      '厚',
      '冬',
    ].some((word) => searchable.includes(word));
  }

  private isHotWeatherRequest(requestText?: string): boolean {
    if (!requestText) return false;
    const text = requestText.toLowerCase();
    return ['热', '太热', '清爽', '凉快', '夏', '透气', 'light', 'cool', 'summer'].some(
      (word) => text.includes(word),
    );
  }

  private overlaps(a?: string[], b?: string[]): boolean {
    return Boolean(
      a?.some((left) =>
        b?.some((right) => left.trim().toLowerCase() === right.trim().toLowerCase()),
      ),
    );
  }

  private complementaryCategoriesFor(core: Garment): string[] {
    return (
      COMPLEMENTARY_CATEGORIES[core.category] ??
      COMPLEMENTARY_CATEGORIES.other
    ).filter((category) => category !== core.category);
  }

  private isEasyColorPair(
    left: Garment['color'] | undefined,
    right: Garment['color'] | undefined,
  ): boolean {
    if (!left || !right) return false;
    const easyColors = new Set(['black', 'white', 'grey', 'beige', 'blue']);
    return easyColors.has(left) || easyColors.has(right);
  }

  private matchesRequest(garment: Garment, requestText: string): boolean {
    const tokens = requestText
      .trim()
      .toLowerCase()
      .split(/[\s,，.。;；、!！?？]+/)
      .filter((token) => token.length >= 2);
    const values = [
      garment.name,
      garment.category,
      garment.color,
      garment.subcategory,
      ...(garment.sceneTags ?? []),
      ...(garment.styleTags ?? []),
      ...(garment.seasons ?? []),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return tokens.some((token) => values.includes(token));
  }

  private reasonFor(title: string, core: Garment, requestText?: string): string {
    const coreName = core.name || '这件衣服';
    if (requestText?.trim()) {
      return `${title}围绕${coreName}，优先匹配“${requestText.trim()}”相关衣物。`;
    }
    return `${title}围绕${coreName}，优先选择衣橱里可穿的互补单品。`;
  }
}
