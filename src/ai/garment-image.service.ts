import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import sharp from 'sharp';
import {
  GARMENT_IMAGE_PROMPTS,
  GARMENT_IMAGE_PROMPT_VERSION,
} from './garment-image-prompts';

export const GARMENT_IMAGE_FETCH = 'GARMENT_IMAGE_FETCH';
export type GarmentImageFamily = keyof typeof GARMENT_IMAGE_PROMPTS;
export interface GeneratedImageResult {
  requestId: string;
  imageUrl: string;
  usage: { input_image_count: number; output_image_count: number };
}
export class GarmentImageError extends Error {
  constructor(
    public readonly kind: 'failed' | 'uncertain',
    public readonly code: string,
  ) {
    super(
      kind === 'uncertain' ? '结果待确认，可能已产生本次费用' : '本次整理失败',
    );
  }
}

@Injectable()
export class GarmentImageService {
  public readonly promptVersion = GARMENT_IMAGE_PROMPT_VERSION;
  public readonly model = 'qwen-image-3.0-pro';
  constructor(
    private readonly config: ConfigService,
    @Inject(GARMENT_IMAGE_FETCH) private readonly fetchImpl: typeof fetch,
  ) {}

  isConfigured(): boolean {
    return (
      this.config.get('QWEN_IMAGE_ENABLED') === true &&
      Boolean(this.config.get<string>('QWEN_API_KEY')?.trim()) &&
      this.config.get('QWEN_IMAGE_MODEL', this.model) === this.model &&
      this.isHttpsUrl(this.config.get<string>('QWEN_IMAGE_API_URL') ?? '')
    );
  }

  async generate(
    inputBytes: Buffer,
    family: GarmentImageFamily,
  ): Promise<GeneratedImageResult> {
    const prompt = GARMENT_IMAGE_PROMPTS[family];
    if (!this.isConfigured() || !prompt)
      throw new GarmentImageError('failed', 'CONFIG_OR_CATEGORY');
    let image: Buffer;
    try {
      image = await sharp(inputBytes)
        .autoOrient()
        .flatten({ background: 'white' })
        .resize(1024, 1024, { fit: 'contain', background: 'white' })
        .jpeg({ quality: 95 })
        .toBuffer();
    } catch {
      throw new GarmentImageError('failed', 'INVALID_INPUT_IMAGE');
    }
    const timeout = Number(this.config.get('QWEN_IMAGE_TIMEOUT_MS', 240000));
    const signal = AbortSignal.timeout(
      Number.isFinite(timeout) && timeout > 0 ? timeout : 240000,
    );
    let response: Response;
    try {
      response = await this.fetchImpl(
        this.config.get<string>('QWEN_IMAGE_API_URL')!,
        {
          method: 'POST',
          headers: {
            Authorization:
              'Bearer ' + this.config.get<string>('QWEN_API_KEY')!.trim(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: this.model,
            input: {
              messages: [
                {
                  role: 'user',
                  content: [
                    {
                      image:
                        'data:image/jpeg;base64,' + image.toString('base64'),
                    },
                    { text: prompt },
                  ],
                },
              ],
            },
            parameters: {
              n: 1,
              size: '1024*1024',
              prompt_extend: false,
              watermark: false,
              seed: 701,
            },
          }),
          signal,
        },
      );
    } catch {
      throw new GarmentImageError('uncertain', 'PROVIDER_CONNECTION');
    }
    let data: any;
    try {
      data = await response.json();
    } catch {
      throw new GarmentImageError('uncertain', 'PROVIDER_INCOMPLETE');
    }
    if (!response.ok) {
      // 只有可确认的供应商拒绝才能声称明确失败，5xx/网关异常仍未知。
      const kind =
        response.status >= 400 &&
        response.status < 500 &&
        (data?.code || data?.error?.code)
          ? 'failed'
          : 'uncertain';
      throw new GarmentImageError(kind, 'PROVIDER_REJECTED');
    }
    if (data?.code || data?.error)
      throw new GarmentImageError('failed', 'PROVIDER_REJECTED');
    const images = (
      Array.isArray(data?.output?.choices) ? data.output.choices : []
    )
      .flatMap((choice: any) =>
        Array.isArray(choice?.message?.content) ? choice.message.content : [],
      )
      .filter((item: any) => typeof item?.image === 'string');
    if (
      images.length !== 1 ||
      typeof data?.request_id !== 'string' ||
      !data.request_id ||
      data?.usage?.input_image_count !== 1 ||
      data?.usage?.output_image_count !== 1 ||
      !this.isHttpsUrl(images[0].image)
    ) {
      throw new GarmentImageError('uncertain', 'PROVIDER_INCOMPLETE');
    }
    return {
      requestId: data.request_id,
      imageUrl: images[0].image,
      usage: { input_image_count: 1, output_image_count: 1 },
    };
  }

  /** 只下载已返回的同一图片；不向生成接口重投。 */
  async downloadImage(url: string): Promise<Buffer> {
    if (!this.isHttpsUrl(url)) throw new Error('结果图片地址无效');
    const response = await this.fetchImpl(url, {
      method: 'GET',
      redirect: 'error',
      signal: AbortSignal.timeout(90000),
    });
    if (!response.ok) throw new Error('结果图片暂时无法下载');
    const bytes = Buffer.from(await response.arrayBuffer());
    const metadata = await sharp(bytes).metadata();
    if (!['jpeg', 'png', 'webp'].includes(metadata.format ?? ''))
      throw new Error('结果不是可读图片');
    return bytes;
  }

  private isHttpsUrl(value: string): boolean {
    try {
      const url = new URL(value);
      return (
        url.protocol === 'https:' &&
        !url.username &&
        !url.password &&
        !/^(localhost|127\.|0\.|10\.|192\.168\.|169\.254\.|\[|172\.(1[6-9]|2\d|3[01])\.)/i.test(
          url.hostname,
        )
      );
    } catch {
      return false;
    }
  }
}
