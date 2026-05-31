import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { buffer } from 'node:stream/consumers';
import { FileService } from '../file/file-service.abstract';
import { GarmentColor } from '../wardrobe/garment-color.enum';
import { GarmentVisionResult } from './dto/garment-vision-result.dto';

type FetchLike = typeof fetch;

export const GARMENT_VISION_FETCH = 'GARMENT_VISION_FETCH';

@Injectable()
export class GarmentVisionService {
  private readonly logger = new Logger(GarmentVisionService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly fileService: FileService,
    @Optional()
    @Inject(GARMENT_VISION_FETCH)
    private readonly fetchImpl: FetchLike = globalThis.fetch.bind(globalThis),
  ) {}

  async analyzeImage(fileName: string): Promise<GarmentVisionResult> {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey) return this.fallback(fileName);

    try {
      const image = await this.fileService.get(fileName);
      if (!image) return this.fallback(fileName);

      const response = await this.fetchImpl(
        `${this.apiBaseUrl()}/v1/chat/completions`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(
            this.buildRequest(fileName, await buffer(image)),
          ),
        },
      );

      if (!response.ok) {
        this.logger.warn(`AI garment vision failed: HTTP ${response.status}`);
        return this.fallback(fileName);
      }

      const payload = await response.json();
      return this.normalizeResult(fileName, this.parseDraft(payload));
    } catch (error) {
      this.logger.warn(
        `AI garment vision failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return this.fallback(fileName);
    }
  }

  private apiBaseUrl(): string {
    return (
      this.configService.get<string>('AI_API_BASE_URL') ??
      'https://api.openai.com'
    ).replace(/\/+$/, '');
  }

  private buildRequest(fileName: string, imageBuffer: Buffer) {
    return {
      model: this.configService.get('AI_VISION_MODEL') ?? 'gpt-4.1-mini',
      messages: [
        {
          role: 'system',
          content:
            '你是衣橱入库助手。只根据图片识别衣物信息，返回严格 JSON，不要返回 Markdown。',
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                task: '识别这件衣物，生成用户可编辑的入库草稿。',
                allowedColors: Object.values(GarmentColor),
                requiredJson: {
                  category:
                    'tops | bottoms | outerwear | dresses | footwear | bags | accessories | activewear | swimwear | underwear | lingerie | other',
                  subcategory: 'string or null',
                  color: 'one allowed color or null',
                  seasons: [
                    'spring | summer | autumn | winter or Chinese tags',
                  ],
                  styleTags: ['style tag strings'],
                  sceneTags: ['scene tag strings'],
                  material: 'string or null',
                  thickness: 'string or null',
                  confidence: 'number from 0 to 1',
                  notes: 'short Chinese note',
                },
              }),
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${this.mimeType(fileName)};base64,${imageBuffer.toString(
                  'base64',
                )}`,
              },
            },
          ],
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0,
      max_tokens: 700,
    };
  }

  private parseDraft(payload: any): Partial<GarmentVisionResult> {
    const content = payload?.choices?.[0]?.message?.content;
    if (!content || typeof content !== 'string') return {};
    return JSON.parse(this.stripCodeFence(content));
  }

  private stripCodeFence(text: string): string {
    return text
      .trim()
      .replace(/^```(?:json)?/i, '')
      .replace(/```$/i, '')
      .trim();
  }

  private normalizeResult(
    fileName: string,
    draft: Partial<GarmentVisionResult>,
  ): GarmentVisionResult {
    return {
      fileName,
      category: this.stringOrDefault(draft.category, 'tops'),
      subcategory: this.stringOrUndefined(draft.subcategory),
      color: this.normalizeColor(draft.color),
      seasons: this.stringArray(draft.seasons),
      styleTags: this.stringArray(draft.styleTags),
      sceneTags: this.stringArray(draft.sceneTags),
      material: this.stringOrUndefined(draft.material),
      thickness: this.stringOrUndefined(draft.thickness),
      confidence: this.confidence(draft.confidence),
      notes:
        this.stringOrUndefined(draft.notes) ??
        'AI 已生成草稿，请确认后再保存。',
    };
  }

  private normalizeColor(color: unknown): GarmentColor | undefined {
    if (typeof color !== 'string') return undefined;
    const normalized = color.toLowerCase();
    return Object.values(GarmentColor).includes(normalized as GarmentColor)
      ? (normalized as GarmentColor)
      : undefined;
  }

  private stringArray(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value.filter(
      (item): item is string => typeof item === 'string' && item.trim() !== '',
    );
  }

  private stringOrDefault(value: unknown, fallback: string): string {
    return typeof value === 'string' && value.trim() ? value.trim() : fallback;
  }

  private stringOrUndefined(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
  }

  private confidence(value: unknown): number {
    return typeof value === 'number' && Number.isFinite(value)
      ? Math.max(0, Math.min(1, value))
      : 0;
  }

  private mimeType(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase();
    if (extension === 'png') return 'image/png';
    if (extension === 'jpg' || extension === 'jpeg') return 'image/jpeg';
    if (extension === 'gif') return 'image/gif';
    return 'image/webp';
  }

  private fallback(fileName: string): GarmentVisionResult {
    return {
      fileName,
      category: 'tops',
      subcategory: undefined,
      color: undefined,
      seasons: [],
      styleTags: [],
      sceneTags: [],
      material: undefined,
      thickness: undefined,
      confidence: 0,
      notes: 'AI 识别服务暂不可用，请手动确认衣物信息。',
    };
  }
}
