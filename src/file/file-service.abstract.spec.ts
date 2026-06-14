import { ConfigService } from '@nestjs/config';
import { Readable } from 'stream';
import sharp from 'sharp';
import { File } from 'src/dal/entity/file.entity';
import { FileService } from './file-service.abstract';

class TestFileService extends FileService {
  async storeImageFromFileUpload(): Promise<File> {
    throw new Error('Not implemented');
  }

  async delete(): Promise<void> {}

  async deleteById(): Promise<any> {}

  async get(): Promise<Readable | undefined> {
    return undefined;
  }

  async getByShareableId(): Promise<Readable | undefined> {
    return undefined;
  }

  protected async store(): Promise<void> {}

  async prepareForTest(imageBuffer: Buffer): Promise<Buffer> {
    return this.prepareGarmentPhotoForStorage(imageBuffer);
  }
}

describe('FileService garment photo preparation', () => {
  it('keeps the garment-like subject and writes a white background', async () => {
    const service = new TestFileService({} as ConfigService);
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
});
