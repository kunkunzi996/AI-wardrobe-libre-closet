import { EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Injectable, NotFoundException } from '@nestjs/common';
import { Garment } from '../../dal/entity/garment.entity';
import { OutfitSlot } from '../../dal/entity/outfit.entity';
import { GarmentStatus } from '../garment-status.enum';
import { OutfitAiResult, OutfitAiService } from '../../ai/outfit-ai.service';
import {
  buildOutfitGarmentProfile,
  deriveOutfitColorRelations,
  type OutfitGarmentProfile,
} from './outfit-tag-profile';
import type { OutfitTemperatureContext } from '../../weather/tencent-weather.service';

/**
 * 调用方使用哪一套推荐规则，由调用方显式声明，不得从数据字段是否存在推断。
 * 「本次有没有拿到实时温度」是数据事实，由 temperatureContext.status 表达。
 */
export type OutfitRuleMode = 'legacy-web' | 'miniapp-taxonomy-v1';

interface BaseGenerateOutfitInput {
  coreGarmentId?: number;
  requestText?: string;
  userId?: number;
}

export interface LegacyWebGenerateOutfitInput extends BaseGenerateOutfitInput {
  mode: 'legacy-web';
  /** 必填：网页旧模式不做默认核心选择，核心必须由调用方指定。 */
  coreGarmentId: number;
  temperatureContext?: never;
}

export interface MiniappGenerateOutfitInput extends BaseGenerateOutfitInput {
  mode: 'miniapp-taxonomy-v1';
  /** 必填：拿不到温度时传 status='unavailable'，不允许缺省。 */
  temperatureContext: OutfitTemperatureContext;
}

export type GenerateOutfitInput =
  | LegacyWebGenerateOutfitInput
  | MiniappGenerateOutfitInput;

export interface GeneratedOutfitPlan {
  title: string;
  reason: string;
  cautions: string[];
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

const PLAN_TITLES = ['方案A：稳妥通勤', '方案B：年轻活泼', '方案C：舒适日常'];

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

  async generateWithAi(
    input: GenerateOutfitInput,
  ): Promise<GeneratedOutfitResult> {
    const garments = await this.garmentRepository.find(
      input.userId != null ? { owner: { id: input.userId } } : { owner: null },
      { populate: ['photo'], orderBy: { id: 'DESC' } },
    );
    const orderedGarments = [...garments].sort(
      (left, right) => right.id - left.id,
    );
    const wearable = orderedGarments.filter(
      (garment) => garment.status === GarmentStatus.Wearable,
    );
    const miniappMode = input.mode === 'miniapp-taxonomy-v1';
    const temperatureContext = miniappMode
      ? input.temperatureContext
      : undefined;
    if (miniappMode && orderedGarments.length === 0) {
      return { plans: [] };
    }
    const candidatePool = miniappMode ? orderedGarments : wearable;
    // 默认核心衣物选择属于小程序新版规则（SPEC 硬约束 5）：优先最新的可穿衣物，
    // 没有可穿衣物时才退到最新的其它状态衣物。网页旧模式不参与该规则，核心必须显式
    // 指定，且只在可穿衣物范围内查找。
    const core = miniappMode
      ? input.coreGarmentId != null
        ? orderedGarments.find((garment) => garment.id === input.coreGarmentId)
        : (wearable[0] ?? orderedGarments[0])
      : wearable.find((garment) => garment.id === input.coreGarmentId);
    if (!core) throw new NotFoundException('Core garment not found');

    const plans = (
      miniappMode
        ? (value: GeneratedOutfitPlan[]) => this.dedupePlans(value)
        : (value: GeneratedOutfitPlan[]) => value
    )(
      PLAN_TITLES.map((title, index) => {
        const selected = this.pickGarments(
          core,
          candidatePool,
          input.requestText,
          index,
          temperatureContext,
          miniappMode,
        );
        const content = miniappMode
          ? this.normalizeMiniappPlan(
              this.reasonFor(title, core, input.requestText),
              [],
              selected,
              input.requestText,
              core,
              temperatureContext,
            )
          : {
              reason: this.reasonFor(title, core, input.requestText),
              cautions: [],
            };
        return {
          title,
          ...content,
          garments: selected,
          slots: selected.map((garment) => ({
            category: garment.category,
            garmentId: garment.id,
          })),
        };
      }),
    );

    const rawAi = this.outfitAiService
      ? await this.outfitAiService.recommend({
          requestText: input.requestText || core.name || '围绕这件衣服搭配',
          coreGarmentId: core.id,
          ...(miniappMode
            ? {
                mode: 'miniapp-taxonomy-v1' as const,
                temperatureContext,
              }
            : {}),
          availableGarments: garments.map((garment) => {
            const profile = miniappMode
              ? buildOutfitGarmentProfile(garment)
              : undefined;
            return {
              id: garment.id,
              name: garment.name,
              category: garment.category,
              color: garment.color,
              seasons: garment.seasons,
              styleTags: garment.styleTags,
              sceneTags: garment.sceneTags,
              status: garment.status,
              ...(profile
                ? {
                    tagsByGroup: profile.tagsByGroup,
                    sourceByGroup: profile.sourceByGroup,
                  }
                : {}),
            };
          }),
        })
      : undefined;

    const shouldExposeAi =
      rawAi &&
      (rawAi.source === 'ai' ||
        (miniappMode &&
          rawAi.source === 'fallback' &&
          rawAi.recommendations.length > 0));
    const ai = shouldExposeAi
      ? this.attachAiGarments(
          rawAi,
          garments,
          input.requestText,
          core,
          temperatureContext,
          miniappMode,
        )
      : undefined;

    return { plans, ai };
  }

  private pickGarments(
    core: Garment,
    garments: Garment[],
    requestText: string | undefined,
    planIndex: number,
    temperatureContext?: OutfitTemperatureContext,
    miniappMode = false,
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
            !this.isIncompatibleWithRequest(
              garment,
              requestText,
              core,
              temperatureContext,
              miniappMode,
            ),
        );
      const picked = this.pickOne(
        candidates,
        core,
        requestText,
        planIndex,
        miniappMode,
      );
      if (picked) selected.set(picked.id, picked);
    }

    return Array.from(selected.values());
  }

  private pickOne(
    candidates: Garment[],
    core: Garment,
    requestText: string | undefined,
    planIndex: number,
    miniappMode = false,
  ): Garment | undefined {
    if (!candidates.length) return undefined;
    const scored = candidates
      .map((garment) => ({
        garment,
        score: this.scoreCandidate(garment, core, requestText, miniappMode),
      }))
      .sort((a, b) => b.score - a.score || b.garment.id - a.garment.id);
    return scored[planIndex % scored.length]?.garment;
  }

  private scoreCandidate(
    garment: Garment,
    core: Garment,
    requestText: string | undefined,
    miniappMode = false,
  ): number {
    if (miniappMode) {
      const garmentProfile = buildOutfitGarmentProfile(garment);
      const coreProfile = buildOutfitGarmentProfile(core);
      let score = 0;
      for (const group of new Set([
        ...Object.keys(garmentProfile.tagsByGroup),
        ...Object.keys(coreProfile.tagsByGroup),
      ])) {
        const garmentTags = garmentProfile.tagsByGroup[group] ?? [];
        const coreTags = coreProfile.tagsByGroup[group] ?? [];
        if (this.overlaps(garmentTags, coreTags)) score += 1;
      }
      if (
        requestText &&
        this.matchesProfileRequest(garmentProfile, requestText)
      ) {
        score += 1;
      }
      return score;
    }
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
    temperatureContext?: OutfitTemperatureContext,
    miniappMode = false,
  ): GeneratedOutfitResult['ai'] {
    if (miniappMode) {
      return this.attachMiniappAiGarments(
        ai,
        garments,
        requestText,
        core,
        temperatureContext,
      );
    }
    // 网页旧模式只做 ID 到实体的映射：不追加颜色关系、不去重、不截断条数。
    // 小程序专用的归一化全部在 attachMiniappAiGarments 内完成。
    const garmentById = new Map(
      garments.map((garment) => [garment.id, garment]),
    );
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

  private dedupePlans(plans: GeneratedOutfitPlan[]): GeneratedOutfitPlan[] {
    const seenPlans = new Set<string>();
    return plans
      .filter((plan) => {
        const dedupeKey = plan.garments
          .map((garment) => garment.id)
          .sort((left, right) => left - right)
          .join(',');
        if (seenPlans.has(dedupeKey)) return false;
        seenPlans.add(dedupeKey);
        return true;
      })
      .slice(0, 3);
  }

  private attachMiniappAiGarments(
    ai: OutfitAiResult,
    garments: Garment[],
    requestText?: string,
    core?: Garment,
    temperatureContext?: OutfitTemperatureContext,
  ): GeneratedOutfitResult['ai'] {
    const garmentById = new Map(
      garments.map((garment) => [garment.id, garment]),
    );
    const seenPlans = new Set<string>();
    const recommendations = ai.recommendations
      .map((recommendation) => {
        const recommendationGarments: Garment[] = [];
        const seenGarments = new Set<number>();
        for (const id of recommendation.garmentIds ?? []) {
          const garment = garmentById.get(id);
          if (!garment || seenGarments.has(garment.id)) continue;
          if (
            this.isIncompatibleWithRequest(
              garment,
              requestText,
              core,
              temperatureContext,
              true,
            )
          ) {
            continue;
          }
          seenGarments.add(garment.id);
          recommendationGarments.push(garment);
        }
        if (
          core &&
          !recommendationGarments.some((garment) => garment.id === core.id)
        ) {
          recommendationGarments.unshift(core);
        }
        if (!recommendationGarments.length) return undefined;
        const garmentIds = recommendationGarments.map((garment) => garment.id);
        const dedupeKey = [...garmentIds].sort((a, b) => a - b).join(',');
        if (seenPlans.has(dedupeKey)) return undefined;
        seenPlans.add(dedupeKey);
        const content = this.normalizeMiniappPlan(
          recommendation.reason,
          recommendation.cautions ?? [],
          recommendationGarments,
          requestText,
          core,
          temperatureContext,
        );
        return {
          ...recommendation,
          ...content,
          garmentIds,
          garments: recommendationGarments,
        };
      })
      .filter(
        (
          recommendation,
        ): recommendation is NonNullable<typeof recommendation> =>
          Boolean(recommendation),
      )
      .slice(0, 3);
    return { ...ai, recommendations };
  }

  private isIncompatibleWithRequest(
    garment: Garment,
    requestText: string | undefined,
    core?: Garment,
    temperatureContext?: OutfitTemperatureContext,
    miniappMode = false,
  ): boolean {
    if (core && garment.id === core.id) return false;
    if (miniappMode) {
      if (!temperatureContext || temperatureContext.status !== 'available') {
        return false;
      }
      const profile = buildOutfitGarmentProfile(garment);
      const weatherTags = profile.tagsByGroup.weather ?? [];
      const thicknessTags = profile.tagsByGroup.thickness ?? [];
      const explicitWarm = this.isExplicitWarmRequest(requestText);
      const explicitCool = this.isExplicitCoolRequest(requestText);
      const highTemperature = (temperatureContext.maxC ?? -Infinity) > 25;
      const lowTemperature = (temperatureContext.minC ?? Infinity) <= 10;
      if (
        highTemperature &&
        !explicitWarm &&
        (weatherTags.includes('冬寒') ||
          thicknessTags.some((tag) => ['厚款', '加厚'].includes(tag)))
      ) {
        return true;
      }
      if (
        lowTemperature &&
        !explicitCool &&
        (weatherTags.includes('夏热') || thicknessTags.includes('极薄'))
      ) {
        return true;
      }
      return false;
    }
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
    return [
      '热',
      '太热',
      '清爽',
      '凉快',
      '夏',
      '透气',
      'light',
      'cool',
      'summer',
    ].some((word) => text.includes(word));
  }

  private isExplicitWarmRequest(requestText?: string): boolean {
    if (!requestText) return false;
    const text = requestText.toLowerCase();
    return [
      '保暖',
      '暖和',
      '御寒',
      '防寒',
      '怕冷',
      '冷',
      'warm',
      'winter',
    ].some((word) => text.includes(word));
  }

  private isExplicitCoolRequest(requestText?: string): boolean {
    if (!requestText) return false;
    const text = requestText.toLowerCase();
    return [
      '凉爽',
      '清凉',
      '清爽',
      '透气',
      '怕热',
      '太热',
      'cool',
      'summer',
    ].some((word) => text.includes(word));
  }

  private matchesProfileRequest(
    profile: OutfitGarmentProfile,
    requestText: string,
  ): boolean {
    const tokens = requestText
      .trim()
      .toLowerCase()
      .split(/[\s,，.。;；、!！?？]+/)
      .filter((token) => token.length >= 2);
    const values = Object.values(profile.tagsByGroup)
      .flat()
      .join(' ')
      .toLowerCase();
    return tokens.some((token) => values.includes(token));
  }

  private statusCautions(garments: Garment[]): string[] {
    const labels: Record<string, string> = {
      [GarmentStatus.Laundry]: '待洗',
      [GarmentStatus.Stored]: '收纳中',
      [GarmentStatus.Damaged]: '需修补',
      [GarmentStatus.Archived]: '已归档',
    };
    return Array.from(
      new Set(
        garments
          .map((garment) => labels[garment.status])
          .filter(Boolean)
          .map((label) => `状态提醒：${label}衣物请先确认。`),
      ),
    );
  }

  private normalizeMiniappPlan(
    reason: string,
    cautions: string[],
    garments: Garment[],
    requestText: string | undefined,
    core: Garment | undefined,
    temperatureContext: OutfitTemperatureContext | undefined,
  ): Pick<GeneratedOutfitPlan, 'reason' | 'cautions'> {
    return {
      reason: this.reasonWithColorRelations(reason, garments),
      cautions: Array.from(
        new Set([
          ...cautions,
          ...this.statusCautions(garments),
          ...this.temperatureCautions(
            garments,
            requestText,
            core,
            temperatureContext,
          ),
        ]),
      ),
    };
  }

  private temperatureCautions(
    garments: Garment[],
    requestText: string | undefined,
    core: Garment | undefined,
    temperatureContext: OutfitTemperatureContext | undefined,
  ): string[] {
    if (!temperatureContext || temperatureContext.status !== 'available') {
      return [];
    }
    const highTemperature = (temperatureContext.maxC ?? -Infinity) > 25;
    const lowTemperature = (temperatureContext.minC ?? Infinity) <= 10;
    // 用户明确表达的需求高于实时温度（HC-03）：冲突单品不被排除，只补注意事项。
    // 因此 AC-03 的两个触发条件都要覆盖——核心衣物本身冲突，或明确需求放行了
    // 冲突的非核心单品；两者文案不同，不能互相冒充。
    const explicitWarm = this.isExplicitWarmRequest(requestText);
    const explicitCool = this.isExplicitCoolRequest(requestText);
    let coreHighConflict = false;
    let coreLowConflict = false;
    let requestedHighConflict = false;
    let requestedLowConflict = false;
    garments.forEach((garment) => {
      const profile = buildOutfitGarmentProfile(garment);
      const thick = (profile.tagsByGroup.thickness ?? []).some((tag) =>
        ['厚款', '加厚'].includes(tag),
      );
      const winter = (profile.tagsByGroup.weather ?? []).includes('冬寒');
      const extremelyThin = (profile.tagsByGroup.thickness ?? []).includes(
        '极薄',
      );
      const summerHot = (profile.tagsByGroup.weather ?? []).includes('夏热');
      const conflictsHigh = highTemperature && (thick || winter);
      const conflictsLow = lowTemperature && (extremelyThin || summerHot);
      if (garment.id === core?.id) {
        coreHighConflict ||= conflictsHigh;
        coreLowConflict ||= conflictsLow;
        return;
      }
      requestedHighConflict ||= conflictsHigh && explicitWarm;
      requestedLowConflict ||= conflictsLow && explicitCool;
    });
    return [
      ...(coreHighConflict
        ? ['温度冲突提醒：核心单品偏厚，请结合体感调整。']
        : []),
      ...(coreLowConflict
        ? ['低温提醒：核心单品偏薄，请注意保暖并结合体感调整。']
        : []),
      ...(requestedHighConflict
        ? ['温度冲突提醒：本次按你的明确需求保留了偏厚单品，请结合体感调整。']
        : []),
      ...(requestedLowConflict
        ? [
            '低温提醒：本次按你的明确需求保留了偏薄单品，请注意保暖并结合体感调整。',
          ]
        : []),
    ];
  }

  private overlaps(a?: string[], b?: string[]): boolean {
    return Boolean(
      a?.some((left) =>
        b?.some(
          (right) => left.trim().toLowerCase() === right.trim().toLowerCase(),
        ),
      ),
    );
  }

  private complementaryCategoriesFor(core: Garment): string[] {
    return (
      COMPLEMENTARY_CATEGORIES[core.category] ?? COMPLEMENTARY_CATEGORIES.other
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

  private reasonFor(
    title: string,
    core: Garment,
    requestText?: string,
  ): string {
    const coreName = core.name || '这件衣服';
    return requestText?.trim()
      ? `${title}围绕${coreName}，优先匹配“${requestText.trim()}”相关衣物。`
      : `${title}围绕${coreName}，优先选择衣橱里可穿的互补单品。`;
  }

  private reasonWithColorRelations(
    reason: string,
    garments: Garment[],
  ): string {
    const relations = deriveOutfitColorRelations(
      garments.map((garment) => buildOutfitGarmentProfile(garment)),
    );
    if (!relations.length) return reason;
    return `${reason} 色彩上形成${relations.join('、')}搭配。`;
  }
}
