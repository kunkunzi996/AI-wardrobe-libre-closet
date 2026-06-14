import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import type { MultipartFile } from '@fastify/multipart';
import { ConfigService } from '@nestjs/config';
import { buffer } from 'node:stream/consumers';
import sharp from 'sharp';
import { FileService } from '../file/file-service.abstract';
import { GarmentColor } from '../wardrobe/garment-color.enum';
import { GarmentVisionResult } from './dto/garment-vision-result.dto';

type FetchLike = typeof fetch;

export const GARMENT_VISION_FETCH = 'GARMENT_VISION_FETCH';

const CHINESE_LABELS: Record<string, string> = {
  spring: '春',
  summer: '夏',
  autumn: '秋',
  fall: '秋',
  winter: '冬',
  formal: '正式',
  business: '商务',
  classic: '经典',
  casual: '休闲',
  commute: '通勤',
  office: '办公室',
  work: '上班',
  date: '约会',
  weekend: '周末',
  daily: '日常',
  outdoor: '户外',
  warm: '保暖',
  basic: '基础款',
  'wide-leg pants': '阔腿裤',
  'wide leg pants': '阔腿裤',
  'puffer jacket': '羽绒服',
  'down jacket': '羽绒服',
  trousers: '西裤',
  pants: '裤子',
  jeans: '牛仔裤',
  shirt: '衬衫',
  blouse: '衬衫',
  blazer: '西装外套',
  coat: '外套',
  'wool blend': '羊毛混纺',
  wool: '羊毛',
  cotton: '棉',
  denim: '牛仔',
  leather: '皮革',
  polyester: '聚酯纤维',
  medium: '中等',
  thin: '偏薄',
  thick: '偏厚',
};

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
    if (!this.apiKey()) return this.fallback(fileName);

    try {
      const image = await this.fileService.get(fileName);
      if (!image) return this.fallback(fileName);
      return this.analyzeImageBuffer(fileName, await buffer(image));
    } catch (error) {
      this.logger.warn(
        `AI garment vision failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return this.fallback(fileName);
    }
  }

  async analyzeUpload(upload: MultipartFile): Promise<GarmentVisionResult> {
    const fileName = upload.filename || 'miniapp-upload.webp';
    if (!this.apiKey()) return this.fallback(fileName);

    try {
      return this.analyzeImageBuffer(fileName, await buffer(upload.file));
    } catch (error) {
      this.logger.warn(
        `AI garment vision failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return this.fallback(fileName);
    }
  }

  private async analyzeImageBuffer(
    fileName: string,
    imageBuffer: Buffer,
  ): Promise<GarmentVisionResult> {
    const apiKey = this.apiKey();
    if (!apiKey) return this.fallback(fileName);

    try {
      const response = await this.fetchWithTimeout(
        `${this.apiBaseUrl()}/v1/chat/completions`,
        apiKey,
        JSON.stringify(
          this.buildRequest(
            fileName,
            await this.prepareVisionImageBuffer(imageBuffer),
          ),
        ),
      );

      if (!response.ok) {
        this.logger.warn(
          `AI garment vision failed: HTTP ${
            response.status
          } ${await this.safeErrorBody(response)}`,
        );
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

  private async fetchWithTimeout(
    url: string,
    apiKey: string,
    body: string,
  ): Promise<Response> {
    const controller = new AbortController();
    let timeoutId: NodeJS.Timeout | undefined;
    try {
      return await Promise.race([
        this.fetchImpl(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body,
          signal: controller.signal,
        }),
        new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => {
            controller.abort();
            reject(
              new Error(
                `AI garment vision timed out after ${this.visionTimeoutMs()}ms`,
              ),
            );
          }, this.visionTimeoutMs());
        }),
      ]);
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }

  private async prepareVisionImageBuffer(imageBuffer: Buffer): Promise<Buffer> {
    try {
      return await sharp(imageBuffer)
        .autoOrient()
        .resize(1024, 1024, {
          fit: sharp.fit.inside,
          withoutEnlargement: true,
        })
        .webp({ quality: 80 })
        .toBuffer();
    } catch (error) {
      this.logger.warn(
        `AI garment vision image compression skipped: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return imageBuffer;
    }
  }

  private apiKey(): string | undefined {
    return (
      this.configService.get<string>('QWEN_API_KEY') ??
      this.configService.get<string>('OPENAI_API_KEY')
    );
  }

  private apiBaseUrl(): string {
    const url = this.usesQwen()
      ? (this.configService.get<string>('QWEN_API_BASE_URL') ??
        'https://dashscope.aliyuncs.com/compatible-mode')
      : (this.configService.get<string>('AI_API_BASE_URL') ??
        'https://api.openai.com');
    return url.replace(/\/+$/, '');
  }

  private visionTimeoutMs(): number {
    const configured = Number(
      this.configService.get<string>('AI_VISION_TIMEOUT_MS'),
    );
    return Number.isFinite(configured) && configured > 0 ? configured : 25000;
  }

  private buildRequest(fileName: string, imageBuffer: Buffer) {
    return {
      model: this.visionModel(),
      messages: [
        {
          role: 'system',
          content:
            '你是中文衣橱入库助手。只根据图片识别衣物信息，返回严格 JSON，不要返回 Markdown。除 category 和 color 必须使用给定枚举值外，subcategory、seasons、styleTags、sceneTags、material、thickness、notes 都必须使用简体中文。',
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
                  seasons: ['春 | 夏 | 秋 | 冬'],
                  styleTags: ['中文风格标签，例如：通勤、休闲、正式、法式'],
                  sceneTags: ['中文场景标签，例如：上班、约会、周末、旅行'],
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
      ...(this.usesQwen() ? { enable_thinking: false } : {}),
    };
  }

  private visionModel(): string {
    if (this.usesQwen()) {
      return (
        this.configService.get<string>('QWEN_VISION_MODEL') ?? 'qwen3.5-plus'
      );
    }
    return this.configService.get<string>('AI_VISION_MODEL') ?? 'gpt-4.1-mini';
  }

  private usesQwen(): boolean {
    return Boolean(this.configService.get<string>('QWEN_API_KEY'));
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

  private async safeErrorBody(response: Response): Promise<string> {
    try {
      return (await response.text()).replace(/\s+/g, ' ').slice(0, 500);
    } catch {
      return '';
    }
  }

  private normalizeResult(
    fileName: string,
    draft: Partial<GarmentVisionResult>,
  ): GarmentVisionResult {
    return {
      fileName,
      category: this.stringOrDefault(draft.category, 'tops'),
      subcategory: this.localizedString(draft.subcategory),
      color: this.normalizeColor(draft.color),
      seasons: this.localizedArray(draft.seasons),
      styleTags: this.localizedArray(draft.styleTags),
      sceneTags: this.localizedArray(draft.sceneTags),
      material: this.localizedString(draft.material),
      thickness: this.localizedString(draft.thickness),
      confidence: this.confidence(draft.confidence),
      notes: this.localizedNotes(draft) ?? 'AI 已生成草稿，请确认后再保存。',
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
    const values = Array.isArray(value) ? value : [value];
    return values.flatMap((item) =>
      typeof item === 'string'
        ? item
            .split(/[,，、]/)
            .map((part) => part.trim())
            .filter(Boolean)
        : [],
    );
  }

  private localizedArray(value: unknown): string[] {
    return this.stringArray(value).map((item) => this.localizeLabel(item));
  }

  private localizedString(value: unknown): string | undefined {
    const text = this.stringOrUndefined(value);
    return text ? this.localizeLabel(text) : undefined;
  }

  private localizedNotes(
    draft: Partial<GarmentVisionResult>,
  ): string | undefined {
    const notes = this.stringOrUndefined(draft.notes);
    if (!notes || !this.containsAsciiWord(notes)) return notes;

    const colorPrefix = draft.color === GarmentColor.BLACK ? '黑色' : '';
    const subcategory =
      this.localizedString(draft.subcategory) ??
      this.categoryLabel(draft.category);
    const style = this.localizedArray(draft.styleTags).slice(0, 2).join('');
    const material = this.localizedString(draft.material);
    const details = [
      colorPrefix && subcategory ? `${colorPrefix}${subcategory}` : subcategory,
      style ? `适合${style}场合` : undefined,
      material ? `材质可能为${material}` : undefined,
    ].filter(Boolean);

    return details.length ? `${details.join('，')}。` : undefined;
  }

  private categoryLabel(category: unknown): string | undefined {
    const labels: Record<string, string> = {
      tops: '上装',
      bottoms: '下装',
      outerwear: '外套',
      dresses: '连衣裙',
      footwear: '鞋履',
      bags: '包袋',
      accessories: '配饰',
      activewear: '运动服',
      swimwear: '泳装',
      underwear: '内衣',
      lingerie: '内衣',
      other: '衣物',
    };
    return typeof category === 'string' ? labels[category] : undefined;
  }

  private containsAsciiWord(value: string): boolean {
    return /[a-zA-Z]{2,}/.test(value);
  }

  private localizeLabel(value: string): string {
    const normalized = value.trim().toLowerCase().replace(/[_-]+/g, ' ');
    return CHINESE_LABELS[normalized] ?? value.trim();
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
