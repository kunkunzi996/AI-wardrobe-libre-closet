import {
  BadRequestException,
  HttpException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
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
import { buffer } from 'node:stream/consumers';
import { randomUUID } from 'node:crypto';
import {
  FileServiceInterface,
  type GarmentPhotos,
} from './file-service.interface';

/** 通用分割 SegmentCommonImage：最长边小于等于 1999，且宽高都小于 2000。 */
export const ALIYUN_SEGMENT_MAX_SIDE = 1999;
/** 分辨率须大于 32×32，短边至少做到 33。 */
export const ALIYUN_SEGMENT_MIN_SIDE = 33;
/**
 * 文档写「图像大小不超过 3 MB」。按十进制 3_000_000 字节封顶，
 * 避免编码结果超过接口的十进制上限。
 */
export const ALIYUN_SEGMENT_MAX_BYTES = 3_000_000;
const GARMENT_CUTOUT_FAILED_MESSAGE = '抠图失败，请重试';

/** 只认 sharp 读到的格式，用来起文件名，不在这里转码。 */
const READABLE_IMAGE_FORMATS: Record<
  string,
  { extension: string; mimetype: string }
> = {
  jpeg: { extension: 'jpg', mimetype: 'image/jpeg' },
  png: { extension: 'png', mimetype: 'image/png' },
  webp: { extension: 'webp', mimetype: 'image/webp' },
  gif: { extension: 'gif', mimetype: 'image/gif' },
  tiff: { extension: 'tiff', mimetype: 'image/tiff' },
  heif: { extension: 'heif', mimetype: 'image/heif' },
  avif: { extension: 'avif', mimetype: 'image/avif' },
};

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
  abstract storePrivateImageBuffer(
    input: Buffer,
    userId: number,
  ): Promise<File>;

  async storeGarmentPhotosFromFileUpload(
    upload: MultipartFile | undefined,
    userId: number,
  ): Promise<GarmentPhotos> {
    if (!upload) throw new BadRequestException('请先选择图片');
    if (!upload.mimetype?.startsWith('image/')) {
      upload.file.resume();
      throw new BadRequestException('请上传图片文件');
    }
    const input = await buffer(upload.file);
    // 必须先保留原字节；原图写入失败时不得继续抠图。
    // 抠图失败则删掉刚写入的原图，调用方不会创建衣物。
    const originalPhoto = await this.storePrivateImageBuffer(input, userId);
    try {
      const photo = await this.storeImageFromFileUpload(
        { ...upload, file: Readable.from(input) } as MultipartFile,
        userId,
      );
      return { originalPhoto, photo };
    } catch (error) {
      await this.removeStoredFileAfterFailure(originalPhoto, userId);
      throw error;
    }
  }

  private async removeStoredFileAfterFailure(
    file: File,
    userId: number,
  ): Promise<void> {
    try {
      await this.deleteById(file.id, userId);
      return;
    } catch (error) {
      this.logger.warn(
        `Removing the original photo row after cutout failure failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
    if (!file.fileName) return;
    try {
      await this.delete(file.fileName);
    } catch (error) {
      this.logger.warn(
        `Removing the original photo bytes after cutout failure failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  protected async privateImageInfo(input: Buffer, userId: number) {
    if (!Number.isSafeInteger(userId) || userId <= 0) {
      throw new UnauthorizedException('请登录后保存原图');
    }
    const info = await this.readableImageInfo(input);
    // 只校验格式，不旋转、缩放、转码或重新抠图。
    return {
      fileName: `private-${randomUUID()}.${info.extension}`,
      mimetype: info.mimetype,
    };
  }

  /** 读宽高和格式。不旋转、不缩放、不重新编码。 */
  protected async readableImageInfo(input: Buffer): Promise<{
    extension: string;
    mimetype: string;
    width: number;
    height: number;
    orientation: number;
  }> {
    const metadata = await sharp(input)
      .metadata()
      .catch(() => undefined);
    return this.imageInfoFromMetadata(metadata);
  }

  private imageInfoFromMetadata(
    metadata:
      | {
          format?: string;
          width?: number;
          height?: number;
          orientation?: number;
        }
      | undefined,
  ): {
    extension: string;
    mimetype: string;
    width: number;
    height: number;
    orientation: number;
  } {
    const format = metadata?.format
      ? READABLE_IMAGE_FORMATS[metadata.format]
      : undefined;
    const width = metadata?.width ?? 0;
    const height = metadata?.height ?? 0;
    if (!format || width < 1 || height < 1) {
      throw new BadRequestException('图片内容无效或格式不支持');
    }
    return {
      extension: format.extension,
      mimetype: format.mimetype,
      width,
      height,
      orientation: metadata?.orientation ?? 1,
    };
  }

  protected imageFileNameForBytes(
    requestedName: string | undefined,
    extension: string,
  ): string {
    if (!requestedName) return `${randomUUID()}.${extension}`;
    const dot = requestedName.lastIndexOf('.');
    const base = dot > 0 ? requestedName.slice(0, dot) : requestedName;
    return `${base}.${extension}`;
  }

  protected async processedImageRecord(
    outputBuffer: Buffer,
    fileName?: string,
  ): Promise<{ fileName: string; mimetype: string }> {
    const info = await this.readableImageInfo(outputBuffer);
    return {
      fileName: this.imageFileNameForBytes(fileName, info.extension),
      mimetype: info.mimetype,
    };
  }
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
    try {
      const segmentationInput =
        await this.fitImageForAliyunSegmentation(imageBuffer);
      const cutout = await this.removeBackgroundWithAliyun(segmentationInput);
      if (!cutout?.length) {
        throw new BadRequestException(GARMENT_CUTOUT_FAILED_MESSAGE);
      }
      return cutout;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.warn(
        `Garment background cleanup failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw new BadRequestException(GARMENT_CUTOUT_FAILED_MESSAGE);
    }
  }

  /**
   * 只处理送去阿里云的副本。入库原图仍是调用方持有的那份字节。
   * 通用分割接受 JPEG/JPG/PNG/BMP/WEBP，且不接受部分 PNG 位深，因此副本统一转成 JPEG。
   */
  private async fitImageForAliyunSegmentation(
    imageBuffer: Buffer,
  ): Promise<Buffer> {
    const info = await this.readableImageInfo(imageBuffer).catch(
      () => undefined,
    );
    if (!info) {
      this.logger.warn('Aliyun segmentation input is not a readable image');
      throw new BadRequestException(GARMENT_CUTOUT_FAILED_MESSAGE);
    }
    // 已经是正向、且落在阿里云限制内的 JPEG，原样送出，避免再降一次质量。
    if (
      info.orientation === 1 &&
      (await this.isAcceptedAliyunSegmentInput(imageBuffer))
    ) {
      return imageBuffer;
    }

    const fitted = await this.searchAliyunFit(
      imageBuffer,
      info.width,
      info.height,
    );
    if (fitted) return fitted;

    this.logger.warn(
      `Aliyun segmentation input could not be fitted within ${ALIYUN_SEGMENT_MAX_SIDE}px and ${ALIYUN_SEGMENT_MAX_BYTES} bytes`,
    );
    throw new BadRequestException(GARMENT_CUTOUT_FAILED_MESSAGE);
  }

  private async searchAliyunFit(
    imageBuffer: Buffer,
    width: number,
    height: number,
  ): Promise<Buffer | undefined> {
    const qualities = [85, 70, 55, 40, 25];
    let longestSide = Math.min(
      Math.max(width, height),
      ALIYUN_SEGMENT_MAX_SIDE,
    );
    for (let step = 0; step < 8; step += 1) {
      const accepted = await this.encodeAcceptedAliyunInput(
        imageBuffer,
        width,
        height,
        longestSide,
        qualities,
      );
      if (accepted) return accepted;
      const nextSide = Math.max(
        ALIYUN_SEGMENT_MIN_SIDE,
        Math.floor(longestSide * 0.7),
      );
      if (nextSide >= longestSide) return undefined;
      longestSide = nextSide;
    }
    return undefined;
  }

  private async encodeAcceptedAliyunInput(
    imageBuffer: Buffer,
    width: number,
    height: number,
    longestSide: number,
    qualities: number[],
  ): Promise<Buffer | undefined> {
    const box = this.aliyunResizeBox(width, height, longestSide);
    for (const quality of qualities) {
      const output = await sharp(imageBuffer)
        .autoOrient()
        .resize({
          width: box.width,
          height: box.height,
          fit: 'inside',
          withoutEnlargement: box.withoutEnlargement,
        })
        .flatten({ background: '#ffffff' })
        .jpeg({ quality })
        .toBuffer();
      if (await this.isAcceptedAliyunSegmentInput(output)) return output;
    }
    return undefined;
  }

  private aliyunResizeBox(
    width: number,
    height: number,
    longestSide: number,
  ): { width: number; height: number; withoutEnlargement: boolean } {
    const longest = Math.max(width, height);
    const shortest = Math.min(width, height);
    let targetLong = Math.min(
      longest,
      ALIYUN_SEGMENT_MAX_SIDE,
      Math.max(longestSide, 1),
    );
    if (shortest < ALIYUN_SEGMENT_MIN_SIDE) {
      const upscaled = Math.ceil(
        (longest * ALIYUN_SEGMENT_MIN_SIDE) / shortest,
      );
      targetLong = Math.min(
        ALIYUN_SEGMENT_MAX_SIDE,
        Math.max(targetLong, upscaled),
      );
    }
    return {
      width: targetLong,
      height: targetLong,
      withoutEnlargement: targetLong <= longest,
    };
  }

  private async isAcceptedAliyunSegmentInput(image: Buffer): Promise<boolean> {
    if (image.length < 1 || image.length > ALIYUN_SEGMENT_MAX_BYTES) {
      return false;
    }
    const metadata = await sharp(image).metadata();
    const width = metadata.width ?? 0;
    const height = metadata.height ?? 0;
    return (
      metadata.format === 'jpeg' &&
      width >= ALIYUN_SEGMENT_MIN_SIDE &&
      height >= ALIYUN_SEGMENT_MIN_SIDE &&
      width <= ALIYUN_SEGMENT_MAX_SIDE &&
      height <= ALIYUN_SEGMENT_MAX_SIDE
    );
  }

  protected async removeBackgroundWithAliyun(
    imageBuffer: Buffer,
  ): Promise<Buffer> {
    if (!this.hasAliyunBackgroundRemovalConfig()) {
      this.logger.warn('Aliyun garment background cleanup is not configured');
      throw new BadRequestException(GARMENT_CUTOUT_FAILED_MESSAGE);
    }

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
      await this.assertAliyunCutoutBytes(resultBuffer);
      return resultBuffer;
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.warn(
        `Aliyun garment background cleanup failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw new BadRequestException(GARMENT_CUTOUT_FAILED_MESSAGE);
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

  /** 确认阿里云结果能当图片读。不缩放，也不改成 WebP。 */
  private async assertAliyunCutoutBytes(resultBuffer: Buffer): Promise<void> {
    const info = await this.readableImageInfo(resultBuffer).catch(
      () => undefined,
    );
    if (info) return;
    this.logger.warn('Aliyun segmentation result is not a readable image');
    throw new BadRequestException(GARMENT_CUTOUT_FAILED_MESSAGE);
  }

  protected async normalizeOriginalPhoto(imageBuffer: Buffer): Promise<Buffer> {
    return sharp(imageBuffer)
      .autoOrient()
      .webp({ quality: 100 })
      .resize(1080, 1080, { fit: sharp.fit.inside })
      .toBuffer();
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
