import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'node:crypto';
import { Readable } from 'stream';
import { buffer } from 'node:stream/consumers';
import type { MultipartFile } from '@fastify/multipart';
import sharp from 'sharp';
import { File } from '../dal/entity/file.entity';
import {
  ALIYUN_SEGMENT_MAX_BYTES,
  ALIYUN_SEGMENT_MAX_SIDE,
  ALIYUN_SEGMENT_MIN_SIDE,
  FileService,
} from './file-service.abstract';

class TestFileService extends FileService {
  aliyunResult: Buffer | null = null;
  aliyunError?: Error;
  aliyunCalls = 0;
  aliyunInputs: Buffer[] = [];
  useRealAliyun = false;
  rawWrites: Buffer[] = [];
  displayInputs: Buffer[] = [];
  deletedIds: Array<{ id: unknown; userId: unknown }> = [];
  deletedNames: string[] = [];
  deleteByIdError?: Error;
  privateWriteError?: Error;

  async storeImageFromFileUpload(
    upload?: MultipartFile,
    userId?: number,
  ): Promise<File> {
    const input = await buffer(upload!.file);
    await this.prepareGarmentPhotoForStorage(input);
    this.displayInputs.push(input);
    return Object.assign(new File(), {
      id: 2,
      fileName: 'display.webp',
      createdBy: { id: userId },
    });
  }

  // 只模拟字节存储，不在测试替身中实现双图保存业务。
  storePrivateImageBuffer(input: Buffer, userId: any): Promise<File> {
    if (this.privateWriteError) return Promise.reject(this.privateWriteError);
    this.rawWrites.push(Buffer.from(input));
    return Promise.resolve(
      Object.assign(new File(), {
        id: 1,
        fileName: 'private-upload.png',
        mimetype: 'image/png',
        createdBy: { id: userId },
      }),
    );
  }

  storeOriginalImageFromFileUpload(): Promise<File> {
    return Promise.reject(new Error('Not implemented'));
  }

  copyStoredFile(): Promise<File> {
    return Promise.reject(new Error('Not implemented'));
  }

  delete(fileName: string): Promise<void> {
    this.deletedNames.push(fileName);
    return Promise.resolve();
  }

  deleteById(fileId: any, userId: any): Promise<any> {
    if (this.deleteByIdError) return Promise.reject(this.deleteByIdError);
    this.deletedIds.push({ id: fileId, userId });
    return Promise.resolve();
  }

  get(): Promise<Readable | undefined> {
    return Promise.resolve(undefined);
  }

  getByShareableId(): Promise<Readable | undefined> {
    return Promise.resolve(undefined);
  }

  protected async store(): Promise<void> {}

  protected removeBackgroundWithAliyun(imageBuffer: Buffer): Promise<Buffer> {
    this.aliyunInputs.push(Buffer.from(imageBuffer));
    if (this.useRealAliyun) {
      return super.removeBackgroundWithAliyun(imageBuffer);
    }
    this.aliyunCalls += 1;
    if (this.aliyunError) return Promise.reject(this.aliyunError);
    return Promise.resolve(this.aliyunResult ?? Buffer.alloc(0));
  }

  async prepareForTest(imageBuffer: Buffer): Promise<Buffer> {
    return this.prepareGarmentPhotoForStorage(imageBuffer);
  }
}

async function tinyPng(width = 40, height = 48): Promise<Buffer> {
  return sharp({
    create: { width, height, channels: 3, background: '#336699' },
  })
    .png()
    .toBuffer();
}

function uploadOf(input: Buffer, mimetype = 'image/png'): MultipartFile {
  return {
    filename: 'camera.png',
    mimetype,
    file: Readable.from(input),
  } as MultipartFile;
}

describe('FileService garment photo preparation', () => {
  const configService = (values: Record<string, string | undefined> = {}) =>
    ({
      get: jest.fn((key: string) => values[key]),
      getOrThrow: jest.fn((key: string) => values[key] ?? 'lazztech_icon.webp'),
    }) as any as ConfigService;

  it('TEST-015 双图保存只消费上传一次，原字节不处理，展示图只抠一次', async () => {
    const service = new TestFileService(configService());
    const input = await sharp({
      create: { width: 8, height: 8, channels: 3, background: '#336699' },
    })
      .png()
      .toBuffer();
    service.aliyunResult = Buffer.from('test-cutout');
    let streamStarts = 0;
    const upload = {
      filename: 'camera.png',
      mimetype: 'image/png',
      file: Readable.from(
        (async function* () {
          streamStarts += 1;
          yield Promise.resolve(input.subarray(0, 12));
          yield Promise.resolve(input.subarray(12));
        })(),
      ),
    } as MultipartFile;
    const save = Reflect.get(service, 'storeGarmentPhotosFromFileUpload');
    expect(save).toEqual(expect.any(Function));

    const result = await save.call(service, upload, 42);

    expect(streamStarts).toBe(1);
    expect(service.rawWrites).toEqual([input]);
    expect(service.displayInputs).toEqual([input]);
    expect(service.aliyunCalls).toBe(1);
    expect(result).toMatchObject({
      originalPhoto: { id: 1, fileName: 'private-upload.png' },
      photo: { id: 2, fileName: 'display.webp' },
    });
    expect(result.originalPhoto.createdBy.id).toBe(42);
    expect(result.photo.createdBy.id).toBe(42);
  });

  it('TEST-015 原图写入失败不报告保存成功，也不继续抠图', async () => {
    const service = new TestFileService(configService());
    service.privateWriteError = new Error('测试原图存储失败');
    const save = Reflect.get(service, 'storeGarmentPhotosFromFileUpload');
    expect(save).toEqual(expect.any(Function));
    const upload = {
      mimetype: 'image/png',
      filename: 'camera.png',
      file: Readable.from(Buffer.from('test-original')),
    } as MultipartFile;

    await expect(save.call(service, upload, 42)).rejects.toThrow(
      '测试原图存储失败',
    );
    expect(service.aliyunCalls).toBe(0);
    expect(service.aliyunInputs).toEqual([]);
    expect(service.displayInputs).toEqual([]);
    expect(service.deletedIds).toEqual([]);
  });

  it('uses Aliyun segmentation output when cloud cleanup succeeds', async () => {
    const service = new TestFileService(
      configService({
        BG_REMOVAL_PROVIDER: 'aliyun',
        ALIBABA_CLOUD_ACCESS_KEY_ID: 'test-key-id',
        ALIBABA_CLOUD_ACCESS_KEY_SECRET: 'test-key-secret',
      }),
    );
    const aliyunImage = await sharp({
      create: {
        width: 40,
        height: 40,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      },
    })
      .webp()
      .toBuffer();
    service.aliyunResult = aliyunImage;

    const output = await service.prepareForTest(await tinyPng());

    expect(service.aliyunCalls).toBe(1);
    await expect(sharp(output).metadata()).resolves.toMatchObject({
      format: 'webp',
    });
  });

  it('送阿里云前把副本缩进限制，私有原图字节保持不变', async () => {
    const service = new TestFileService(
      configService({
        BG_REMOVAL_PROVIDER: 'aliyun',
        ALIBABA_CLOUD_ACCESS_KEY_ID: 'test-key-id',
        ALIBABA_CLOUD_ACCESS_KEY_SECRET: 'test-key-secret',
      }),
    );
    service.useRealAliyun = true;
    const width = 2200;
    const height = 1600;
    const input = await sharp(randomBytes(width * height * 3), {
      raw: { width, height, channels: 3 },
    })
      .jpeg({ quality: 95 })
      .toBuffer();
    expect(Math.max(width, height)).toBeGreaterThan(ALIYUN_SEGMENT_MAX_SIDE);
    expect(input.length).toBeGreaterThan(ALIYUN_SEGMENT_MAX_BYTES);
    const untouched = Buffer.from(input);
    let sent: Buffer | undefined;
    const cutout = await sharp({
      create: { width: 12, height: 12, channels: 3, background: '#ffffff' },
    })
      .png()
      .toBuffer();
    jest.spyOn(service as any, 'createAliyunImagesegClient').mockReturnValue({
      segmentCommonImageAdvance: async (request: {
        imageURLObject: Readable;
      }) => {
        sent = await buffer(request.imageURLObject);
        return {
          body: { data: { imageURL: 'https://imageseg.example/cutout.png' } },
        };
      },
    });
    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      arrayBuffer: () =>
        Promise.resolve(
          cutout.buffer.slice(
            cutout.byteOffset,
            cutout.byteOffset + cutout.byteLength,
          ),
        ),
    } as Response);
    const save = Reflect.get(service, 'storeGarmentPhotosFromFileUpload');

    try {
      const result = await save.call(
        service,
        uploadOf(input, 'image/jpeg'),
        42,
      );

      expect(service.rawWrites).toEqual([input]);
      expect(input.equals(untouched)).toBe(true);
      if (!sent) throw new Error('阿里云没有收到图片');
      expect(sent.equals(input)).toBe(false);
      expect(sent.equals(service.aliyunInputs[0])).toBe(true);
      expect(sent.length).toBeLessThanOrEqual(ALIYUN_SEGMENT_MAX_BYTES);
      const fitted = await sharp(sent).metadata();
      expect(fitted.format).toBe('jpeg');
      expect(
        Math.max(fitted.width ?? 0, fitted.height ?? 0),
      ).toBeLessThanOrEqual(ALIYUN_SEGMENT_MAX_SIDE);
      expect(
        Math.min(fitted.width ?? 0, fitted.height ?? 0),
      ).toBeGreaterThanOrEqual(ALIYUN_SEGMENT_MIN_SIDE);
      expect(result.originalPhoto.fileName).toBe('private-upload.png');
      expect(service.deletedIds).toEqual([]);
      expect(service.displayInputs).toEqual([input]);
    } finally {
      fetchSpy.mockRestore();
    }
  }, 20000);

  it('阿里云抠图失败时抛出明确错误，并删除已写入的原图', async () => {
    const service = new TestFileService(
      configService({
        BG_REMOVAL_PROVIDER: 'aliyun',
        ALIBABA_CLOUD_ACCESS_KEY_ID: 'test-key-id',
        ALIBABA_CLOUD_ACCESS_KEY_SECRET: 'test-key-secret',
      }),
    );
    service.useRealAliyun = true;
    const client = jest.fn(() =>
      Promise.reject(new Error('InvalidImage.Resolution')),
    );
    jest.spyOn(service as any, 'createAliyunImagesegClient').mockReturnValue({
      segmentCommonImageAdvance: client,
    });
    const input = await tinyPng();
    const save = Reflect.get(service, 'storeGarmentPhotosFromFileUpload');

    await expect(save.call(service, uploadOf(input), 42)).rejects.toThrow(
      '抠图失败，请重试',
    );
    expect(client).toHaveBeenCalledTimes(1);
    expect(service.displayInputs).toEqual([]);
    expect(service.rawWrites).toEqual([input]);
    expect(service.deletedIds).toEqual([{ id: 1, userId: 42 }]);
    expect(service.deletedNames).toEqual([]);
  });

  it('未配置阿里云时抠图失败，不调用分割接口，并删除已写入的原图', async () => {
    const service = new TestFileService(configService());
    service.useRealAliyun = true;
    const client = jest.fn();
    jest
      .spyOn(service as any, 'createAliyunImagesegClient')
      .mockImplementation(client);
    const input = await tinyPng();
    const save = Reflect.get(service, 'storeGarmentPhotosFromFileUpload');

    await expect(save.call(service, uploadOf(input), 42)).rejects.toThrow(
      '抠图失败，请重试',
    );
    expect(client).not.toHaveBeenCalled();
    expect(service.displayInputs).toEqual([]);
    expect(service.deletedIds).toEqual([{ id: 1, userId: 42 }]);
  });

  it('原图记录删不掉时仍删除原图文件，并继续抛出抠图失败', async () => {
    const service = new TestFileService(configService());
    service.useRealAliyun = true;
    service.deleteByIdError = new Error('行删除失败');
    jest
      .spyOn(service as any, 'createAliyunImagesegClient')
      .mockImplementation(() => {
        throw new Error('should not create a client without config');
      });
    const input = await tinyPng();
    const save = Reflect.get(service, 'storeGarmentPhotosFromFileUpload');

    await expect(save.call(service, uploadOf(input), 42)).rejects.toThrow(
      '抠图失败，请重试',
    );
    expect(service.deletedIds).toEqual([]);
    expect(service.deletedNames).toEqual(['private-upload.png']);
  });
});
