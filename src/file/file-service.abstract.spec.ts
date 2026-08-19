import { ConfigService } from '@nestjs/config';
import { Readable } from 'stream';
import sharp from 'sharp';
import { File } from 'src/dal/entity/file.entity';
import { FileService } from './file-service.abstract';

class TestFileService extends FileService {
  aliyunResult: Buffer | null = null;
  aliyunCalls = 0;

  storeImageFromFileUpload(): Promise<File> {
    return Promise.reject(new Error('Not implemented'));
  }

  storeOriginalImageFromFileUpload(): Promise<File> {
    return Promise.reject(new Error('Not implemented'));
  }

  copyStoredFile(): Promise<File> {
    return Promise.reject(new Error('Not implemented'));
  }

  async delete(): Promise<void> {}

  async deleteById(): Promise<any> {}

  get(): Promise<Readable | undefined> {
    return Promise.resolve(undefined);
  }

  getByShareableId(): Promise<Readable | undefined> {
    return Promise.resolve(undefined);
  }

  protected async store(): Promise<void> {}

  protected removeBackgroundWithAliyun(): Promise<Buffer | null> {
    this.aliyunCalls += 1;
    return Promise.resolve(this.aliyunResult);
  }

  async prepareForTest(imageBuffer: Buffer): Promise<Buffer> {
    return this.prepareGarmentPhotoForStorage(imageBuffer);
  }
}

describe('FileService garment photo preparation', () => {
  const configService = (values: Record<string, string | undefined> = {}) =>
    ({
      get: jest.fn((key: string) => values[key]),
      getOrThrow: jest.fn((key: string) => values[key] ?? 'lazztech_icon.webp'),
    }) as any as ConfigService;

  it('keeps the garment-like subject and writes a white background', async () => {
    const service = new TestFileService(configService());
    const width = 80;
    const height = 80;
    const channels = 4;
    const raw = Buffer.alloc(width * height * channels, 255);
    for (let y = 24; y < 56; y += 1) {
      for (let x = 24; x < 56; x += 1) {
        const offset = (y * width + x) * channels;
        raw[offset] = 20;
        raw[offset + 1] = 80;
        raw[offset + 2] = 220;
        raw[offset + 3] = 255;
      }
    }
    const input = await sharp(raw, { raw: { width, height, channels } })
      .png()
      .toBuffer();

    const output = await service.prepareForTest(input);
    const decoded = await sharp(output)
      .raw()
      .toBuffer({ resolveWithObject: true });
    const outputChannels = decoded.info.channels;
    const corner = 0;
    const centerX = Math.floor(decoded.info.width / 2);
    const centerY = Math.floor(decoded.info.height / 2);
    const center = (centerY * decoded.info.width + centerX) * outputChannels;

    expect(decoded.data[corner]).toBeGreaterThan(245);
    expect(decoded.data[corner + 1]).toBeGreaterThan(245);
    expect(decoded.data[corner + 2]).toBeGreaterThan(245);
    expect(decoded.data[center + 2]).toBeGreaterThan(decoded.data[center]);
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

    const output = await service.prepareForTest(Buffer.from('original'));

    expect(service.aliyunCalls).toBe(1);
    await expect(sharp(output).metadata()).resolves.toMatchObject({
      format: 'webp',
    });
  });

  it('falls back to local cleanup when Aliyun segmentation returns nothing', async () => {
    const service = new TestFileService(
      configService({
        BG_REMOVAL_PROVIDER: 'aliyun',
        ALIBABA_CLOUD_ACCESS_KEY_ID: 'test-key-id',
        ALIBABA_CLOUD_ACCESS_KEY_SECRET: 'test-key-secret',
      }),
    );
    service.aliyunResult = null;
    const input = await sharp({
      create: {
        width: 60,
        height: 60,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      },
    })
      .png()
      .toBuffer();

    const output = await service.prepareForTest(input);

    expect(service.aliyunCalls).toBe(1);
    await expect(sharp(output).metadata()).resolves.toMatchObject({
      format: 'webp',
    });
  });
});
