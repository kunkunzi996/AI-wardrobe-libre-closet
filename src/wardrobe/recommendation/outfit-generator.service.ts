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
  ai?: OutfitAiResult;
}

const PLAN_TITLES = [
  '方案A：稳妥通勤',
  '方案B：年轻活泼',
  '方案C：舒适日常',
];

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

    const ai = this.outfitAiService
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
    const categories = ['outerwear', 'tops', 'bottoms', 'dresses', 'footwear', 'bags', 'accessories'];

    for (const category of categories) {
      if (category === core.category) continue;
      const candidates = garments.filter((garment) => garment.category === category);
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
    if (this.overlaps(garment.sceneTags, core.sceneTags)) score += 3;
    if (this.overlaps(garment.styleTags, core.styleTags)) score += 2;
    if (requestText && this.matchesRequest(garment, requestText)) score += 2;
    return score;
  }

  private overlaps(a?: string[], b?: string[]): boolean {
    return Boolean(
      a?.some((left) =>
        b?.some((right) => left.trim().toLowerCase() === right.trim().toLowerCase()),
      ),
    );
  }

  private matchesRequest(garment: Garment, requestText: string): boolean {
    const needle = requestText.trim().toLowerCase();
    const values = [
      garment.name,
      garment.category,
      garment.color,
      garment.subcategory,
      ...(garment.sceneTags ?? []),
      ...(garment.styleTags ?? []),
      ...(garment.seasons ?? []),
    ];
    return values.some((value) => value?.toLowerCase().includes(needle));
  }

  private reasonFor(title: string, core: Garment, requestText?: string): string {
    const coreName = core.name || '这件衣服';
    if (requestText?.trim()) {
      return `${title}围绕${coreName}，优先匹配“${requestText.trim()}”相关衣物。`;
    }
    return `${title}围绕${coreName}，优先选择衣橱里可穿的互补单品。`;
  }
}
