import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { OutfitTemperatureContext } from '../weather/tencent-weather.service';

export interface OutfitAiGarment {
  id: number;
  name?: string;
  category: string;
  color?: string;
  seasons?: string[];
  styleTags?: string[];
  sceneTags?: string[];
  status: string;
  tagsByGroup?: Record<string, string[]>;
  sourceByGroup?: Record<string, 'taxonomy' | 'legacy'>;
}

export interface OutfitAiRecommendation {
  title: string;
  garmentIds: number[];
  reason: string;
  cautions: string[];
}

export interface OutfitAiInput {
  requestText: string;
  availableGarments: OutfitAiGarment[];
  coreGarmentId?: number;
  mode?: 'miniapp-taxonomy-v1';
  temperatureContext?: OutfitTemperatureContext;
}

export interface OutfitAiResult {
  source: 'ai' | 'fallback';
  message?: string;
  recommendations: OutfitAiRecommendation[];
}

type FetchLike = typeof fetch;

export const OUTFIT_AI_FETCH = 'OUTFIT_AI_FETCH';

@Injectable()
export class OutfitAiService {
  private readonly logger = new Logger(OutfitAiService.name);

  constructor(
    private readonly configService: ConfigService,
    @Optional()
    @Inject(OUTFIT_AI_FETCH)
    private readonly fetchImpl: FetchLike = globalThis.fetch.bind(globalThis),
  ) {}

  async recommend(input: OutfitAiInput): Promise<OutfitAiResult> {
    const apiKey = this.apiKey();
    if (!apiKey) return this.fallback(input);

    try {
      const response = await this.fetchImpl(
        `${this.apiBaseUrl()}/v1/chat/completions`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(this.buildRequest(input)),
        },
      );
      if (!response.ok) {
        this.logger.warn(
          `AI outfit recommendation failed: HTTP ${response.status} ${await this.safeErrorBody(response)}`,
        );
        return this.fallback(input);
      }
      const payload = await response.json();
      const parsed = this.parseRecommendations(payload);
      const recommendations = this.guardRecommendations(
        parsed.recommendations ?? [],
        input,
      );
      if (!recommendations.length) return this.fallback(input);
      return { source: 'ai', recommendations };
    } catch (error) {
      this.logger.warn(
        `AI outfit recommendation failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return this.fallback(input);
    }
  }

  private apiBaseUrl(): string {
    const url = this.usesQwen()
      ? (this.configService.get<string>('QWEN_API_BASE_URL') ??
        'https://dashscope.aliyuncs.com/compatible-mode')
      : (this.configService.get<string>('AI_API_BASE_URL') ??
        'https://api.openai.com');
    return url.replace(/\/+$/, '');
  }

  private apiKey(): string | undefined {
    return (
      this.configService.get<string>('QWEN_API_KEY') ??
      this.configService.get<string>('OPENAI_API_KEY')
    );
  }

  private buildRequest(input: OutfitAiInput) {
    const miniappMode = input.mode === 'miniapp-taxonomy-v1';
    const coreGarment = input.coreGarmentId
      ? input.availableGarments.find(
          (garment) => garment.id === input.coreGarmentId,
        )
      : undefined;
    return {
      model: this.textModel(),
      messages: [
        {
          role: 'system',
          content:
            '你是衣橱搭配助手。只能从用户真实衣橱里挑选 garment id，不能编造衣物。返回严格 json 对象，不要返回 Markdown。',
        },
        {
          role: 'user',
          content: JSON.stringify({
            ...(miniappMode
              ? {
                  mode: input.mode,
                  temperatureContext: input.temperatureContext,
                }
              : {}),
            requestText: input.requestText,
            requiredCoreGarmentId: input.coreGarmentId,
            coreGarment,
            rules: miniappMode
              ? [
                  '每个有效标签组等权，只能在同一组内计分一次，不能重复累加新旧字段。',
                  '色彩关系必须根据整套衣物动态判断，不能把单件色彩感觉当固定关系。',
                  '遵守天气温度边界和用户明确的冷热反向需求；标签缺失时不推断。',
                  '可从所有库存状态中选择，但非可穿状态必须在 cautions 中明确提醒。',
                  '每套必须包含核心单品（若提供），最多返回三套且衣物 id 集合不得重复。',
                ]
              : [
                  'Every recommendation must include requiredCoreGarmentId when it is provided.',
                  'Treat coreGarment as the main item. Other garments should complement it.',
                  'Do not replace the core garment with another garment in the same category.',
                  'Mention the core garment by name or category in the reason.',
                ],
            availableGarments: input.availableGarments,
            requiredShape: {
              recommendations: [
                {
                  title: 'string',
                  garmentIds: ['number[]'],
                  reason: 'string',
                  cautions: ['string[]'],
                },
              ],
            },
          }),
        },
      ],
      response_format: { type: 'json_object' },
      max_completion_tokens: 900,
      ...(this.usesQwen() ? { enable_thinking: false } : {}),
    };
  }

  private async safeErrorBody(response: Response): Promise<string> {
    try {
      return (await response.text()).slice(0, 500);
    } catch {
      return '';
    }
  }

  private textModel(): string {
    if (this.usesQwen()) {
      return (
        this.configService.get<string>('QWEN_TEXT_MODEL') ?? 'qwen3.5-plus'
      );
    }
    const configured =
      this.configService.get<string>('AI_TEXT_MODEL') ?? 'gpt-4.1-mini';
    if (configured === 'gpt-5.3') return 'gpt-5.3-chat-latest';
    return configured;
  }

  private usesQwen(): boolean {
    return Boolean(this.configService.get<string>('QWEN_API_KEY'));
  }

  private parseRecommendations(payload: any): {
    recommendations?: OutfitAiRecommendation[];
  } {
    const outputText =
      payload?.output_text ??
      payload?.choices?.[0]?.message?.content ??
      payload?.output
        ?.flatMap((item: any) => item?.content ?? [])
        ?.find((content: any) => content?.type === 'output_text')?.text;
    if (!outputText) return {};
    return JSON.parse(outputText);
  }

  private guardRecommendations(
    recommendations: OutfitAiRecommendation[],
    input: OutfitAiInput,
  ): OutfitAiRecommendation[] {
    if (input.mode === 'miniapp-taxonomy-v1') {
      return this.guardMiniappRecommendations(recommendations, input);
    }
    const garments = input.availableGarments;
    const wearableIds = new Set(
      garments
        .filter((garment) => garment.status === 'wearable')
        .map((garment) => garment.id),
    );
    const requiredCoreGarmentId =
      input.coreGarmentId && wearableIds.has(input.coreGarmentId)
        ? input.coreGarmentId
        : undefined;

    return recommendations
      .map((recommendation) => {
        const originalIds = recommendation.garmentIds ?? [];
        const garmentIds = originalIds.filter((id) => wearableIds.has(id));
        if (
          requiredCoreGarmentId &&
          !garmentIds.includes(requiredCoreGarmentId)
        ) {
          garmentIds.unshift(requiredCoreGarmentId);
        }
        const removedCount = originalIds.length - garmentIds.length;
        return {
          title: recommendation.title || 'AI搭配方案',
          garmentIds,
          reason: recommendation.reason || '根据你的衣橱和需求生成。',
          cautions:
            removedCount > 0
              ? [
                  ...(recommendation.cautions ?? []),
                  '已移除不存在或不可穿的衣物。',
                ]
              : (recommendation.cautions ?? []),
        };
      })
      .filter((recommendation) => recommendation.garmentIds.length > 0);
  }

  private guardMiniappRecommendations(
    recommendations: OutfitAiRecommendation[],
    input: OutfitAiInput,
  ): OutfitAiRecommendation[] {
    const garmentById = new Map(
      input.availableGarments.map((garment) => [garment.id, garment]),
    );
    const requiredCoreGarmentId = input.coreGarmentId
      ? garmentById.has(input.coreGarmentId)
        ? input.coreGarmentId
        : undefined
      : undefined;
    const seenPlans = new Set<string>();
    return recommendations
      .map((recommendation) => {
        const originalIds = recommendation.garmentIds ?? [];
        const seen = new Set<number>();
        const garmentIds = originalIds.filter((id) => {
          if (!garmentById.has(id) || seen.has(id)) return false;
          seen.add(id);
          return true;
        });
        if (
          requiredCoreGarmentId &&
          !garmentIds.includes(requiredCoreGarmentId)
        ) {
          garmentIds.unshift(requiredCoreGarmentId);
        }
        const removedCount = originalIds.length - garmentIds.length;
        const dedupeKey = [...garmentIds].sort((a, b) => a - b).join(',');
        if (seenPlans.has(dedupeKey)) return undefined;
        seenPlans.add(dedupeKey);
        return {
          title: recommendation.title || 'AI搭配方案',
          garmentIds,
          reason: recommendation.reason || '根据你的衣橱和需求生成。',
          cautions: Array.from(
            new Set([
              ...(recommendation.cautions ?? []),
              ...(removedCount > 0 ? ['已移除不存在或重复的衣物。'] : []),
            ]),
          ),
        };
      })
      .filter(
        (
          recommendation,
        ): recommendation is NonNullable<typeof recommendation> =>
          Boolean(recommendation && recommendation.garmentIds.length > 0),
      )
      .slice(0, 3);
  }

  private fallback(input: OutfitAiInput): OutfitAiResult {
    if (input.mode === 'miniapp-taxonomy-v1') {
      return this.miniappFallback();
    }
    const wearable = input.availableGarments.filter(
      (garment) => garment.status === 'wearable',
    );
    const selected = wearable
      .map((garment) => ({
        garment,
        score: this.scoreFallback(garment, input.requestText),
      }))
      .sort((a, b) => b.score - a.score || a.garment.id - b.garment.id)
      .slice(0, 6)
      .map((item) => item.garment.id);
    if (
      input.coreGarmentId &&
      wearable.some((garment) => garment.id === input.coreGarmentId)
    ) {
      if (selected.includes(input.coreGarmentId)) {
        selected.splice(selected.indexOf(input.coreGarmentId), 1);
      }
      selected.unshift(input.coreGarmentId);
      selected.splice(6);
    }

    return {
      source: 'fallback',
      message: 'AI暂时不可用，先为你按衣橱标签筛选出这些单品。',
      recommendations: selected.length
        ? [
            {
              title: '规则筛选方案',
              garmentIds: selected,
              reason: '按颜色、风格、场景和衣物状态先筛出可穿单品。',
              cautions: ['这是规则筛选结果，不是 AI 生成结果。'],
            },
          ]
        : [],
    };
  }

  private miniappFallback(): OutfitAiResult {
    return {
      source: 'fallback',
      message: 'AI暂时不可用，先为你按衣橱标签筛选出这些单品。',
      recommendations: [],
    };
  }

  private scoreFallback(garment: OutfitAiGarment, requestText: string): number {
    const text = requestText.toLowerCase();
    const values = [
      garment.name,
      garment.category,
      garment.color,
      ...(garment.seasons ?? []),
      ...(garment.styleTags ?? []),
      ...(garment.sceneTags ?? []),
    ];
    return values.reduce((score, value) => {
      if (!value) return score;
      return text.includes(value.toLowerCase()) ? score + 2 : score;
    }, 0);
  }
}
