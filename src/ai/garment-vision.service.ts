import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import type { MultipartFile } from '@fastify/multipart';
import { ConfigService } from '@nestjs/config';
import { buffer } from 'node:stream/consumers';
import sharp from 'sharp';
import { FileService } from '../file/file-service.abstract';
import { GarmentColor } from '../wardrobe/garment-color.enum';
import {
  COLOR_LABEL_TO_VALUE,
  COLOR_VALUE_TO_LABEL,
  GARMENT_TAG_TAXONOMY,
  SEASON_ALIASES,
  SEASON_LABEL_TO_VALUE,
  sanitizeGarmentTaxonomySelection,
  type GarmentTagGroup,
  type GarmentTaxonomySelection,
} from '../wardrobe/garment-tag-taxonomy';
import {
  GARMENT_CHEST_MARK_POSITION_VALUES,
  GARMENT_CHEST_MARK_TYPE_VALUES,
  GARMENT_FEATURE_PRESENCE_VALUES,
  GARMENT_POCKET_POSITION_VALUES,
  type GarmentChestMarkPosition,
  type GarmentChestMarkType,
  type GarmentFeaturePresence,
  type GarmentPocketPosition,
  GarmentVisionResult,
} from './dto/garment-vision-result.dto';

type FetchLike = typeof fetch;

export const GARMENT_VISION_FETCH = 'GARMENT_VISION_FETCH';

const CHINESE_LABELS: Record<string, string> = {
  spring: '春季',
  summer: '夏季',
  autumn: '秋季',
  fall: '秋季',
  winter: '冬季',
  formal: '商务',
  business: '商务',
  classic: '经典',
  casual: '休闲',
  commute: '通勤',
  office: '通勤',
  work: '通勤',
  date: '约会',
  weekend: '日常',
  daily: '日常',
  outdoor: '户外',
  warm: '保暖',
  basic: '简约',
  'wide-leg pants': '裤装',
  'wide leg pants': '裤装',
  'puffer jacket': '羽绒服',
  'down jacket': '羽绒服',
  'white sneakers': '鞋履',
  sneakers: '鞋履',
  trousers: '裤装',
  pants: '裤装',
  jeans: '裤装',
  shirt: '衬衫',
  blouse: '衬衫',
  blazer: '西装',
  coat: '大衣',
  'wool blend': '混纺',
  wool: '羊毛',
  cotton: '棉',
  denim: '牛仔',
  leather: '皮革',
  polyester: '涤纶',
  medium: '适中',
  thin: '薄款',
  thick: '厚款',
  上班: '通勤',
  办公室: '通勤',
  西装外套: '西装',
  阔腿裤: '裤装',
  牛仔裤: '裤装',
  西裤: '裤装',
  裤子: '裤装',
  羊毛混纺: '混纺',
  聚酯纤维: '涤纶',
  中等: '适中',
  偏薄: '薄款',
  偏厚: '厚款',
};

const CATEGORY_ALIASES: Record<string, string> = {
  top: 'tops',
  shirt: 'tops',
  tshirt: 'tops',
  't shirt': 'tops',
  tee: 'tops',
  pants: 'bottoms',
  trousers: 'bottoms',
  jeans: 'bottoms',
  shorts: 'bottoms',
  skirt: 'bottoms',
  coat: 'outerwear',
  jacket: 'outerwear',
  blazer: 'outerwear',
  dress: 'dresses',
  sneaker: 'footwear',
  sneakers: 'footwear',
  shoe: 'footwear',
  shoes: 'footwear',
  footwear: 'footwear',
  bag: 'bags',
  handbag: 'bags',
  backpack: 'bags',
  accessory: 'accessories',
  accessories: 'accessories',
  hat: 'accessories',
  cap: 'accessories',
};

const VALID_CATEGORIES = new Set([
  'tops',
  'bottoms',
  'outerwear',
  'dresses',
  'footwear',
  'bags',
  'accessories',
  'other',
]);

const PRESENCE_ALIASES: Record<string, GarmentFeaturePresence> = {
  yes: 'yes',
  true: 'yes',
  visible: 'yes',
  has: 'yes',
  有: 'yes',
  no: 'no',
  false: 'no',
  none: 'no',
  without: 'no',
  无: 'no',
  没有: 'no',
  unknown: 'unknown',
  unsure: 'unknown',
  unclear: 'unknown',
  uncertain: 'unknown',
  不确定: 'unknown',
  看不清: 'unknown',
};

const POCKET_POSITION_ALIASES: Record<string, GarmentPocketPosition> = {
  chest: 'chest',
  'chest-pocket': 'chest',
  'chest pocket': 'chest',
  breast: 'chest',
  'left chest': 'chest',
  'right chest': 'chest',
  胸前: 'chest',
  胸口: 'chest',
  side: 'side',
  'side-pocket': 'side',
  'side pocket': 'side',
  側边: 'side',
  侧边: 'side',
  侧面: 'side',
  other: 'other',
  其他: 'other',
  unknown: 'unknown',
};

const CHEST_MARK_TYPE_ALIASES: Record<string, GarmentChestMarkType> = {
  text: 'text',
  letter: 'text',
  letters: 'text',
  word: 'text',
  words: 'text',
  文字: 'text',
  字母: 'text',
  label: 'label',
  tag: 'label',
  标签: 'label',
  标牌: 'label',
  icon: 'icon',
  logo: 'icon',
  symbol: 'icon',
  图标: 'icon',
  标志: 'icon',
  mixed: 'mixed',
  both: 'mixed',
  混合: 'mixed',
  unknown: 'unknown',
};

const CHEST_MARK_POSITION_ALIASES: Record<string, GarmentChestMarkPosition> = {
  'chest-left': 'chest-left',
  'left chest': 'chest-left',
  'left-chest': 'chest-left',
  'left side chest': 'chest-left',
  左胸: 'chest-left',
  左侧胸前: 'chest-left',
  'chest-center': 'chest-center',
  'center chest': 'chest-center',
  'center-chest': 'chest-center',
  'middle chest': 'chest-center',
  胸前正中: 'chest-center',
  胸前中间: 'chest-center',
  other: 'other',
  其他: 'other',
  unknown: 'unknown',
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
      const imageBuffer = await buffer(upload.file);
      this.logger.log(
        `AI garment vision upload received: ${fileName}, ${
          upload.mimetype || 'unknown'
        }, ${imageBuffer.length} bytes`,
      );
      return this.analyzeImageBuffer(fileName, imageBuffer);
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
    return this.configService.get<string>('QWEN_API_KEY');
  }

  private apiBaseUrl(): string {
    const url =
      this.configService.get<string>('QWEN_API_BASE_URL') ??
      'https://dashscope.aliyuncs.com/compatible-mode';
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
            '你是中文衣橱入库助手。只根据图片识别衣物信息，返回严格 JSON，不要返回 Markdown。taxonomyTags 的每个值必须逐字选自 allowedTaxonomy，禁止创造新标签；不确定的标签组返回空数组。对于看不清、被遮挡或不确定的结构化字段，必须返回 unknown，不要猜。',
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                task: '识别这件衣物，生成用户可编辑的入库草稿。',
                targetItemTypes: ['clothes', 'shoes', 'bags', 'accessories'],
                categoryRules: {
                  footwear:
                    'Use footwear for shoes, sneakers, canvas shoes, boots, sandals, and slippers.',
                  bags: 'Use bags for handbags, backpacks, totes, and shoulder bags.',
                  accessories:
                    'Use accessories for hats, caps, scarves, jewelry, belts, and small wearable items.',
                },
                allowedTaxonomy: GARMENT_TAG_TAXONOMY,
                requiredJson: {
                  category:
                    'tops | bottoms | outerwear | dresses | footwear | bags | accessories | other',
                  taxonomyTags:
                    'object; keys must come from allowedTaxonomy; every array item must exactly match one value from that key',
                  pocketPresence: 'yes | no | unknown',
                  pocketPosition: 'chest | side | other | unknown',
                  chestMarkPresence: 'yes | no | unknown',
                  chestMarkType: 'text | label | icon | mixed | unknown',
                  chestMarkPosition:
                    'chest-left | chest-center | other | unknown',
                  chestMarkText: 'short text or null',
                  confidence: 'number from 0 to 1',
                  notes: 'short Chinese note',
                },
                rules: [
                  'Do not return any taxonomy tag that is absent from allowedTaxonomy.',
                  'Use one or more exact tags only when the image supports them; otherwise use an empty array.',
                  'Only return pocketPresence=yes when a pocket is clearly visible.',
                  'Only return pocketPresence=no when the chest/side area is clear and you are confident there is no pocket.',
                  'If pocket visibility or chest mark visibility is uncertain, return unknown.',
                  'Only fill chestMarkText when the text is clearly readable.',
                ],
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
      max_tokens: 900,
      enable_thinking: false,
    };
  }

  private visionModel(): string {
    return (
      this.configService.get<string>('QWEN_VISION_MODEL') ?? 'qwen3.7-plus'
    );
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
    const taxonomyTags = this.normalizeTaxonomyTags(draft);
    return {
      fileName,
      category: this.normalizeCategory(draft.category),
      subcategory: taxonomyTags.category?.[0],
      color: this.taxonomyColor(taxonomyTags),
      seasons: (taxonomyTags.season ?? []).map(
        (tag) => SEASON_LABEL_TO_VALUE[tag],
      ),
      styleTags: taxonomyTags.style ?? [],
      sceneTags: taxonomyTags.occasion ?? [],
      material: taxonomyTags.material?.[0],
      thickness: taxonomyTags.thickness?.[0],
      fit: taxonomyTags.fit?.[0],
      taxonomyTags,
      pocketPresence: this.normalizePresence(draft.pocketPresence),
      pocketPosition: this.normalizePocketPosition(
        draft.pocketPresence,
        draft.pocketPosition,
      ),
      chestMarkPresence: this.normalizePresence(draft.chestMarkPresence),
      chestMarkType: this.normalizeChestMarkType(
        draft.chestMarkPresence,
        draft.chestMarkType,
      ),
      chestMarkPosition: this.normalizeChestMarkPosition(
        draft.chestMarkPresence,
        draft.chestMarkPosition,
      ),
      chestMarkText: this.normalizeChestMarkText(
        draft.chestMarkPresence,
        draft.chestMarkText,
      ),
      confidence: this.confidence(draft.confidence),
      notes:
        this.localizedNotes(draft, taxonomyTags) ??
        'AI 已生成草稿，请确认后再保存。',
    };
  }

  private normalizeTaxonomyTags(
    draft: Partial<GarmentVisionResult>,
  ): GarmentTaxonomySelection {
    const explicit = sanitizeGarmentTaxonomySelection(draft.taxonomyTags);
    const normalizedColor = this.normalizeColor(draft.color);
    const legacyStyleTags = this.localizedArray(draft.styleTags);
    const legacySceneTags = this.localizedArray(draft.sceneTags);
    const legacy = sanitizeGarmentTaxonomySelection({
      season: this.taxonomySeasonTags(draft.seasons),
      color: normalizedColor ? [COLOR_VALUE_TO_LABEL[normalizedColor]] : [],
      style: legacyStyleTags,
      wearingFeel: legacyStyleTags,
      occasion: [...legacySceneTags, ...legacyStyleTags],
      material: this.localizedString(draft.material),
      thickness: this.localizedString(draft.thickness),
      category: this.localizedString(draft.subcategory),
      fit: this.localizedString(draft.fit),
    });

    const result: GarmentTaxonomySelection = {};
    for (const group of Object.keys(
      GARMENT_TAG_TAXONOMY,
    ) as GarmentTagGroup[]) {
      const tags = explicit[group] ?? legacy[group];
      if (tags?.length) result[group] = tags;
    }
    return result;
  }

  private taxonomySeasonTags(value: unknown): string[] {
    return this.localizedArray(value).flatMap((tag) => {
      const direct = SEASON_ALIASES[tag];
      if (direct) return [direct];
      return [
        tag.includes('春') ? '春季' : undefined,
        tag.includes('夏') ? '夏季' : undefined,
        tag.includes('秋') ? '秋季' : undefined,
        tag.includes('冬') ? '冬季' : undefined,
      ].filter((item): item is string => Boolean(item));
    });
  }

  private taxonomyColor(
    taxonomyTags: GarmentTaxonomySelection,
  ): GarmentColor | undefined {
    const label = taxonomyTags.color?.[0];
    return label ? COLOR_LABEL_TO_VALUE[label] : undefined;
  }

  private normalizePresence(value: unknown): GarmentFeaturePresence {
    if (value === true) return 'yes';
    if (value === false) return 'no';
    const normalized = this.normalizeAlias(value, PRESENCE_ALIASES);
    return GARMENT_FEATURE_PRESENCE_VALUES.includes(
      normalized as GarmentFeaturePresence,
    )
      ? (normalized as GarmentFeaturePresence)
      : 'unknown';
  }

  private normalizePocketPosition(
    presence: unknown,
    value: unknown,
  ): GarmentPocketPosition {
    if (this.normalizePresence(presence) !== 'yes') return 'unknown';
    const normalized = this.normalizeAlias(value, POCKET_POSITION_ALIASES);
    return GARMENT_POCKET_POSITION_VALUES.includes(
      normalized as GarmentPocketPosition,
    )
      ? (normalized as GarmentPocketPosition)
      : 'unknown';
  }

  private normalizeChestMarkType(
    presence: unknown,
    value: unknown,
  ): GarmentChestMarkType {
    if (this.normalizePresence(presence) !== 'yes') return 'unknown';
    const normalized = this.normalizeAlias(value, CHEST_MARK_TYPE_ALIASES);
    return GARMENT_CHEST_MARK_TYPE_VALUES.includes(
      normalized as GarmentChestMarkType,
    )
      ? (normalized as GarmentChestMarkType)
      : 'unknown';
  }

  private normalizeChestMarkPosition(
    presence: unknown,
    value: unknown,
  ): GarmentChestMarkPosition {
    if (this.normalizePresence(presence) !== 'yes') return 'unknown';
    const normalized = this.normalizeAlias(value, CHEST_MARK_POSITION_ALIASES);
    return GARMENT_CHEST_MARK_POSITION_VALUES.includes(
      normalized as GarmentChestMarkPosition,
    )
      ? (normalized as GarmentChestMarkPosition)
      : 'unknown';
  }

  private normalizeChestMarkText(
    presence: unknown,
    value: unknown,
  ): string | null {
    if (this.normalizePresence(presence) !== 'yes') return null;
    return this.stringOrUndefined(value) ?? null;
  }

  private normalizeColor(color: unknown): GarmentColor | undefined {
    if (typeof color !== 'string') return undefined;
    const normalized = color.toLowerCase();
    return Object.values(GarmentColor).includes(normalized as GarmentColor)
      ? (normalized as GarmentColor)
      : undefined;
  }

  private normalizeCategory(category: unknown): string {
    if (typeof category !== 'string') return 'tops';
    const normalized = category.trim().toLowerCase().replace(/[_-]+/g, ' ');
    if (!normalized) return 'tops';
    const aliased = CATEGORY_ALIASES[normalized] ?? normalized;
    return VALID_CATEGORIES.has(aliased) ? aliased : 'other';
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
    taxonomyTags: GarmentTaxonomySelection,
  ): string | undefined {
    const notes = this.stringOrUndefined(draft.notes);
    if (!notes || !this.containsAsciiWord(notes)) return notes;

    const colorPrefix = taxonomyTags.color?.[0] ?? '';
    const subcategory =
      taxonomyTags.category?.[0] ?? this.categoryLabel(draft.category);
    const style = taxonomyTags.style?.slice(0, 2).join('');
    const material = taxonomyTags.material?.[0];
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

  private normalizeAlias<T extends string>(
    value: unknown,
    aliases: Record<string, T>,
  ): T | undefined {
    if (typeof value !== 'string' || !value.trim()) return undefined;
    const normalized = value.trim().toLowerCase().replace(/[_]+/g, '-');
    return aliases[normalized] ?? aliases[normalized.replace(/-/g, ' ')];
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
      fit: undefined,
      taxonomyTags: {},
      pocketPresence: 'unknown',
      pocketPosition: 'unknown',
      chestMarkPresence: 'unknown',
      chestMarkType: 'unknown',
      chestMarkPosition: 'unknown',
      chestMarkText: null,
      confidence: 0,
      notes: 'AI 识别服务暂不可用，请手动确认衣物信息。',
    };
  }
}
