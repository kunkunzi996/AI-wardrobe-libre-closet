import { EntityManager } from '@mikro-orm/core';
import { getRepositoryToken } from '@mikro-orm/nestjs';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { S3Module, S3ModuleOptions } from 'nestjs-s3';
import { File } from '../../dal/entity/file.entity';
import { S3FileService } from './s3-file.service';
import { Upload } from '@aws-sdk/lib-storage';
import { Readable } from 'node:stream';
import { buffer } from 'node:stream/consumers';
import sharp from 'sharp';

jest.mock('@aws-sdk/lib-storage', () => ({
  Upload: jest.fn().mockImplementation(() => ({
    done: jest.fn().mockResolvedValue({}),
  })),
}));

describe('S3FileService', () => {
  let service: S3FileService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        S3Module.forRoot({
          config: {
            accessKeyId: 'minio',
            secretAccessKey: 'password',
            endpoint: 'http://127.0.0.1:9000',
            s3ForcePathStyle: true,
            signatureVersion: 'v4',
          },
        } as S3ModuleOptions),
      ],
      providers: [
        S3FileService,
        ConfigService,
        {
          provide: getRepositoryToken(File),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            persistAndFlush: jest.fn(),
          },
        },
        {
          provide: EntityManager,
          useValue: {
            query: jest.fn(),
            // you can mock other functions inside
            // the entity manager object, my case only needed query method
          },
        },
      ],
    }).compile();

    service = module.get<S3FileService>(S3FileService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

describe('TEST-023 S3 复制私有图片', () => {
  it('TEST-023 私有复制保持原字节/真实 MIME/主人且不公开 ACL 或分享读取', async () => {
    jest.clearAllMocks();
    const data = await sharp({
      create: { width: 9, height: 7, channels: 3, background: '#223344' },
    })
      .png()
      .toBuffer();
    const repository = {
      create: jest.fn((value) => Object.assign(new File(), { id: 99 }, value)),
      findOneOrFail: jest.fn(() => Promise.resolve(copied)),
    };
    const em = { persistAndFlush: jest.fn() };
    const s3 = {
      getObject: jest.fn(() => Promise.resolve({ Body: Readable.from(data) })),
    };
    const service = new S3FileService(
      s3 as any,
      { get: () => 'test-private-bucket' } as any,
      repository as any,
      em as any,
    );
    const copied = await service.copyStoredFile('private-source.png', 3);
    expect(copied.fileName).toMatch(/^private-.*\.png$/);
    expect(copied.mimetype).toBe('image/png');
    expect(copied.createdBy).toBe(3);
    expect(copied.fileName).not.toBe('private-source.png');
    const params = (Upload as unknown as jest.Mock).mock.calls[0][0].params;
    expect(
      Buffer.isBuffer(params.Body) ? params.Body : await buffer(params.Body),
    ).toEqual(data);
    expect(params.ContentType).toBe('image/png');
    expect(params.ACL).not.toBe('public-read');
    const reads = s3.getObject.mock.calls.length;
    await expect(service.getByShareableId('copied-share')).rejects.toThrow();
    expect(s3.getObject.mock.calls).toHaveLength(reads);
    expect(em.persistAndFlush).toHaveBeenCalledWith(copied);
  });
});

describe('TEST-015 S3FileService 私有字节合同', () => {
  const makePrivateStorage = () => {
    jest.clearAllMocks();
    const file = Object.assign(new File(), {
      id: 32,
      fileName: 'private-camera.png',
      shareableId: 'private-share',
      createdBy: { id: 42 },
    });
    const repository = {
      create: jest.fn((data) => Object.assign(new File(), { id: 32 }, data)),
      findOneOrFail: jest.fn().mockResolvedValue(file),
    };
    const em = { persistAndFlush: jest.fn().mockResolvedValue(undefined) };
    const s3 = {
      getObject: jest.fn().mockImplementation(() =>
        Promise.resolve({
          Body: Readable.from(Buffer.from('private-byte-fixture')),
        }),
      ),
    };
    const config = { get: jest.fn(() => 'test-private-bucket') };
    const service = new S3FileService(
      s3 as any,
      config as any,
      repository as any,
      em as any,
    );
    return { service, repository, em, s3, file };
  };

  it('TEST-015 私有图片上传保留原字节，不能设置公开 ACL', async () => {
    const { service, repository, em } = makePrivateStorage();
    const input = await sharp({
      create: { width: 8, height: 8, channels: 3, background: '#339966' },
    })
      .png()
      .toBuffer();
    const save = Reflect.get(service, 'storePrivateImageBuffer');
    expect(save).toEqual(expect.any(Function));

    const stored = await save.call(service, input, 42);

    expect(stored.fileName).toMatch(/^private-/);
    expect(stored.mimetype).toBe('image/png');
    const params = (Upload as unknown as jest.Mock).mock.calls[0][0].params;
    expect(params).toMatchObject({
      Bucket: 'test-private-bucket',
      Key: stored.fileName,
      ContentType: 'image/png',
    });
    const bytes = Buffer.isBuffer(params.Body)
      ? params.Body
      : await buffer(params.Body);
    expect(bytes).toEqual(input);
    expect(params.ACL === undefined || params.ACL === 'private').toBe(true);
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        createdBy: 42,
        fileName: stored.fileName,
      }),
    );
    expect(em.persistAndFlush).toHaveBeenCalledWith(stored);
  });

  it('TEST-015 私有分享编号不读 S3，内部文件读取仍可用', async () => {
    const { service, file, s3 } = makePrivateStorage();

    await expect(service.getByShareableId(file.shareableId)).rejects.toThrow();
    expect(s3.getObject).not.toHaveBeenCalled();
    const stream = await service.get(file.fileName);
    expect(await buffer(stream!)).toEqual(Buffer.from('private-byte-fixture'));
  });
});
