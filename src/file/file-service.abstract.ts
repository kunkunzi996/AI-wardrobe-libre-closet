import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MultipartFile } from '@fastify/multipart';
import { join } from 'path';
import sharp from 'sharp';
import ImagesegClient, {
  SegmentCommonImageAdvanceRequest,
} from '@alicloud/imageseg20191230';
import { Config as AliyunOpenApiConfig } from '@alicloud/openapi-client';
import { RuntimeOptions } from '@alicloud/tea-util';
import { File } from 'src/dal/entity/file.entity';
import Stream, { Readable } from 'stream';
import { FileServiceInterface } from './file-service.interface';

@Injectable()
export abstract class FileService implements FileServiceInterface {
  public logger = new Logger(FileService.name);

  public watermark: Promise<Buffer<ArrayBufferLike>>;

  constructor(readonly configService: ConfigService) {}

  public nobgFileName(fileName: string): string {
    const extIndex = fileName.lastIndexOf('.');
    return extIndex === -1
      ? `${fileName}-nobg`
      : `${fileName.slice(0, extIndex)}-nobg${fileName.slice(extIndex)}`;
  }

  async getNobgVariant(fileName: string): Promise<Readable | null> {
    const nobgName = this.nobgFileName(fileName);

    const existing = await this.get(nobgName).catch(() => undefined);
    if (existing) {
      return existing;
    }

    return null;
  }

  abstract storeImageFromFileUpload(
    upload: MultipartFile | undefined,
    userId: any,
    fileName?: string,
  ): Promise<File>;
  abstract storeOriginalImageFromFileUpload(
    upload: MultipartFile | undefined,
    userId: any,
    fileName?: string,
  ): Promise<File>;
  abstract copyStoredFile(sourceFileName: string, userId: any): Promise<File>;
  abstract delete(fileName: string): Promise<void>;

  async storeNobgVariantFromStream(
    stream: Readable,
    originalFileName: string,
  ): Promise<void> {
    const nobgName = this.nobgFileName(originalFileName);
    const transformer = sharp()
      .webp({ quality: 100 })
      .resize(1080, 1080, { fit: sharp.fit.inside });
    const passThrough = new Stream.PassThrough();
    const storePromise = this.store(nobgName, passThrough);
    stream.on('error', (err) => passThrough.destroy(err));
    transformer.on('error', (err) => passThrough.destroy(err));
    stream.pipe(transformer).pipe(passThrough);
    await storePromise;
  }

  abstract deleteById(fileId: any, userId: any): Promise<any>;
  abstract get(fileName: string): Promise<Readable | undefined>;
  abstract getByShareableId(shareableId: string): Promise<Readable | undefined>;
  protected abstract store(fileName: string, stream: Readable): Promise<void>;

  protected async prepareGarmentPhotoForStorage(
    imageBuffer: Buffer,
  ): Promise<Buffer> {
    const aliyunResult = await this.removeBackgroundWithAliyun(imageBuffer);
    if (aliyunResult) return aliyunResult;

    try {
      return await this.cutOutGarmentOnWhite(imageBuffer);
    } catch (error) {
      this.logger.warn(
        `Garment background cleanup failed, storing normalized original: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return this.normalizeOriginalPhoto(imageBuffer);
    }
  }

  protected async removeBackgroundWithAliyun(
    imageBuffer: Buffer,
  ): Promise<Buffer | null> {
    if (!this.hasAliyunBackgroundRemovalConfig()) return null;

    try {
      const client = this.createAliyunImagesegClient();
      const request = new SegmentCommonImageAdvanceRequest({
        imageURLObject: Readable.from(imageBuffer),
        returnForm:
          this.configService.get<string>('ALIYUN_IMAGE_SEG_RETURN_FORM') ??
          'whiteBK',
      });
      const response = await client.segmentCommonImageAdvance(
        request,
        new RuntimeOptions({}),
      );
      const imageURL = response.body?.data?.imageURL;
      if (!imageURL) {
        throw new Error('Aliyun image segmentation returned empty imageURL');
      }

      const imageResponse = await this.fetchWithTimeout(
        imageURL,
        this.aliyunImageSegTimeoutMs(),
      );
      if (!imageResponse.ok) {
        throw new Error(
          `Aliyun image segmentation result download failed: HTTP ${imageResponse.status}`,
        );
      }
      const resultBuffer = Buffer.from(await imageResponse.arrayBuffer());
      return this.normalizeOriginalPhoto(resultBuffer);
    } catch (error) {
      this.logger.warn(
        `Aliyun garment background cleanup failed, falling back locally: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return null;
    }
  }

  private createAliyunImagesegClient(): ImagesegClient {
    const config = new AliyunOpenApiConfig({
      accessKeyId: this.aliyunAccessKeyId(),
      accessKeySecret: this.aliyunAccessKeySecret(),
    });
    config.endpoint =
      this.configService.get<string>('ALIYUN_IMAGE_SEG_ENDPOINT') ??
      'imageseg.cn-shanghai.aliyuncs.com';
    config.regionId =
      this.configService.get<string>('ALIYUN_IMAGE_SEG_REGION') ??
      'cn-shanghai';
    return new ImagesegClient(config);
  }

  private hasAliyunBackgroundRemovalConfig(): boolean {
    const provider = this.configService.get<string>('BG_REMOVAL_PROVIDER');
    if (provider && provider !== 'aliyun') return false;
    return Boolean(this.aliyunAccessKeyId() && this.aliyunAccessKeySecret());
  }

  private aliyunAccessKeyId(): string | undefined {
    return (
      this.configService.get<string>('ALIBABA_CLOUD_ACCESS_KEY_ID') ??
      this.configService.get<string>('ALIYUN_ACCESS_KEY_ID')
    );
  }

  private aliyunAccessKeySecret(): string | undefined {
    return (
      this.configService.get<string>('ALIBABA_CLOUD_ACCESS_KEY_SECRET') ??
      this.configService.get<string>('ALIYUN_ACCESS_KEY_SECRET')
    );
  }

  private aliyunImageSegTimeoutMs(): number {
    const configured = Number(
      this.configService.get<string>('ALIYUN_IMAGE_SEG_TIMEOUT_MS'),
    );
    return Number.isFinite(configured) && configured > 0 ? configured : 30000;
  }

  private async fetchWithTimeout(
    url: string,
    timeoutMs: number,
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, { signal: controller.signal });
    } finally {
      clearTimeout(timeoutId);
    }
  }

  protected async normalizeOriginalPhoto(imageBuffer: Buffer): Promise<Buffer> {
    return sharp(imageBuffer)
      .autoOrient()
      .webp({ quality: 100 })
      .resize(1080, 1080, { fit: sharp.fit.inside })
      .toBuffer();
  }

  private async cutOutGarmentOnWhite(imageBuffer: Buffer): Promise<Buffer> {
    const image = await sharp(imageBuffer)
      .autoOrient()
      .resize(1080, 1080, { fit: sharp.fit.inside })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const { width, height, channels } = image.info;
    if (channels !== 4 || width < 4 || height < 4) {
      return this.normalizeOriginalPhoto(imageBuffer);
    }

    const pixels = image.data;
    const bg = this.estimateEdgeBackground(pixels, width, height, channels);
    const background = this.findConnectedBackground(
      pixels,
      width,
      height,
      channels,
      bg,
    );

    const output = Buffer.from(pixels);
    for (let index = 0; index < background.length; index += 1) {
      const pixelOffset = index * channels;
      if (background[index]) {
        output[pixelOffset] = 255;
        output[pixelOffset + 1] = 255;
        output[pixelOffset + 2] = 255;
        output[pixelOffset + 3] = 0;
      }
    }

    const foreground = await sharp(output, {
      raw: { width, height, channels },
    })
      .png()
      .toBuffer();

    return sharp({
      create: {
        width,
        height,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      },
    })
      .composite([{ input: foreground }])
      .webp({ quality: 100 })
      .toBuffer();
  }

  private estimateEdgeBackground(
    pixels: Buffer,
    width: number,
    height: number,
    channels: number,
  ): [number, number, number] {
    const sampleStep = Math.max(1, Math.floor(Math.min(width, height) / 80));
    const totals = [0, 0, 0];
    let count = 0;

    const add = (x: number, y: number) => {
      const offset = (y * width + x) * channels;
      if (pixels[offset + 3] < 10) return;
      totals[0] += pixels[offset];
      totals[1] += pixels[offset + 1];
      totals[2] += pixels[offset + 2];
      count += 1;
    };

    for (let x = 0; x < width; x += sampleStep) {
      add(x, 0);
      add(x, height - 1);
    }
    for (let y = 0; y < height; y += sampleStep) {
      add(0, y);
      add(width - 1, y);
    }

    if (count === 0) return [255, 255, 255];
    return [
      Math.round(totals[0] / count),
      Math.round(totals[1] / count),
      Math.round(totals[2] / count),
    ];
  }

  private findConnectedBackground(
    pixels: Buffer,
    width: number,
    height: number,
    channels: number,
    bg: [number, number, number],
  ): Uint8Array {
    const visited = new Uint8Array(width * height);
    const queue = new Int32Array(width * height);
    let head = 0;
    let tail = 0;
    const threshold = 62;

    const enqueue = (x: number, y: number) => {
      const index = y * width + x;
      if (visited[index]) return;
      const offset = index * channels;
      if (
        pixels[offset + 3] >= 10 &&
        this.colorDistance(pixels, offset, bg) > threshold
      ) {
        return;
      }
      visited[index] = 1;
      queue[tail] = index;
      tail += 1;
    };

    for (let x = 0; x < width; x += 1) {
      enqueue(x, 0);
      enqueue(x, height - 1);
    }
    for (let y = 0; y < height; y += 1) {
      enqueue(0, y);
      enqueue(width - 1, y);
    }

    while (head < tail) {
      const index = queue[head];
      head += 1;
      const x = index % width;
      const y = Math.floor(index / width);
      if (x > 0) enqueue(x - 1, y);
      if (x < width - 1) enqueue(x + 1, y);
      if (y > 0) enqueue(x, y - 1);
      if (y < height - 1) enqueue(x, y + 1);
    }

    return visited;
  }

  private colorDistance(
    pixels: Buffer,
    offset: number,
    bg: [number, number, number],
  ): number {
    const red = pixels[offset] - bg[0];
    const green = pixels[offset + 1] - bg[1];
    const blue = pixels[offset + 2] - bg[2];
    return Math.sqrt(red * red + green * green + blue * blue);
  }

  async getWatermark() {
    return sharp(
      join(
        process.cwd(),
        'public',
        'assets',
        this.configService.getOrThrow('ICON_NAME'),
      ),
    )
      .resize(150, 150)
      .extend({
        top: 0,
        bottom: 20,
        left: 20,
        right: 0,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .composite([
        {
          input: Buffer.from([0, 0, 0, 200]),
          raw: {
            width: 1,
            height: 1,
            channels: 4,
          },
          tile: true,
          blend: 'dest-in',
        },
      ])
      .toBuffer();
  }

  async watermarkImage(
    fileStream: Stream.Readable | undefined,
  ): Promise<Readable | undefined> {
    const watermark = await this.getWatermark();
    return fileStream?.pipe(
      sharp()
        .jpeg()
        .resize(1080, 1080, { fit: sharp.fit.inside })
        .composite([{ input: watermark, gravity: 'southwest' }]),
    );
  }
}
