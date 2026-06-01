import { Inject, Injectable, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface OutfitAiGarment {
  id: number;
  name?: string;
  category: string;
  color?: string;
  seasons?: string[];
  styleTags?: string[];
  sceneTags?: string[];
  status: string;
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
  constructor(
    private readonly configService: ConfigService,
    @Optional()
    @Inject(OUTFIT_AI_FETCH)
    private readonly fetchImpl: FetchLike = globalThis.fetch.bind(globalThis),
  ) {}

  async recommend(input: OutfitAiInput): Promise<OutfitAiResult> {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
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
      if (!response.ok) return this.fallback(input);
      const payload = await response.json();
      const parsed = this.parseRecommendations(payload);
      const recommendations = this.guardRecommendations(
        parsed.recommendations ?? [],
        input.availableGarments,
      );
      if (!recommendations.length) return this.fallback(input);
      return { source: 'ai', recommendations };
    } catch {
      return this.fallback(input);
    }
  }

  private apiBaseUrl(): string {
    return (
      this.configService.get<string>('AI_API_BASE_URL') ??
      'https://api.openai.com'
    ).replace(/\/+$/, '');
  }

  private buildRequest(input: OutfitAiInput) {
    return {
      model: this.textModel(),
      messages: [
        {
          role: 'system',
          content:
            '你是衣橱搭配助手。只能从用户真实衣橱里挑选 garment id，不能编造衣物。返回 JSON，不要返回 Markdown。',
        },
        {
          role: 'user',
          content: JSON.stringify({
            requestText: input.requestText,
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
    };
  }

  private textModel(): string {
    const configured =
      this.configService.get<string>('AI_TEXT_MODEL') ?? 'gpt-4.1-mini';
    if (configured === 'gpt-5.3') return 'gpt-5.3-chat-latest';
    return configured;
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
    garments: OutfitAiGarment[],
  ): OutfitAiRecommendation[] {
    const wearableIds = new Set(
      garments
        .filter((garment) => garment.status === 'wearable')
        .map((garment) => garment.id),
    );

    return recommendations
      .map((recommendation) => {
        const originalIds = recommendation.garmentIds ?? [];
        const garmentIds = originalIds.filter((id) => wearableIds.has(id));
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

  private fallback(input: OutfitAiInput): OutfitAiResult {
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
