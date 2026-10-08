import { EntityManager } from '@mikro-orm/core';
import { getRepositoryToken } from '@mikro-orm/nestjs';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import fs from 'fs';
import { Readable } from 'node:stream';
import { buffer } from 'node:stream/consumers';
import sharp from 'sharp';
import { File } from '../../dal/entity/file.entity';
import { LocalFileService } from './local-file.service';

jest.mock('fs', () => ({
  ...jest.createMockFromModule<typeof import('fs')>('fs'),
  promises: { writeFile: jest.fn().mockResolvedValue(undefined) },
}));

describe('LocalFileService', () => {
  let service: LocalFileService;

  beforeEach(async () => {
    jest.clearAllMocks();
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.mkdirSync as jest.Mock).mockImplementation(() => {});

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocalFileService,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn(() => ''),
          },
        },
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

    service = module.get<LocalFileService>(LocalFileService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

describe('TEST-023 本地复制私有图片', () => {
  it('TEST-023 私有标记、原字节、扩展名与 MIME 保留；目标 File 独立且不经抠图', async () => {
    jest.clearAllMocks();
    const data = await sharp({
      create: { width: 9, height: 7, channels: 3, background: '#223344' },
    })
      .png()
      .toBuffer();
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.createReadStream as jest.Mock).mockImplementation(() =>
      Readable.from(data),
    );
    let written: Buffer | undefined, copied: File;
    const repository = {
      create: jest.fn((value) => Object.assign(new File(), { id: 99 }, value)),
      findOneOrFail: jest.fn(() => Promise.resolve(copied)),
    };
    const em = { persistAndFlush: jest.fn() };
    const service = new LocalFileService(
      { getOrThrow: () => 'test-memory-storage', get: jest.fn() } as any,
      repository as any,
      em as any,
    );
    const externalWrite = jest
      .spyOn(service as any, 'store')
      .mockImplementation(async (_name: unknown, stream: unknown) => {
        written = await buffer(stream as Readable);
      });
    const write = jest
      .spyOn(fs.promises, 'writeFile')
      .mockImplementation((_file, data) => {
        written = Buffer.from(data as Uint8Array);
        return Promise.resolve();
      });
    const matting = jest
      .spyOn(service as any, 'prepareGarmentPhotoForStorage')
      .mockImplementation(() => {
        throw new Error('复制不得抠图');
      });
    try {
      copied = await service.copyStoredFile('private-source.png', 3);
      expect(copied.fileName).toMatch(/^private-.*\.png$/);
      expect(copied.mimetype).toBe('image/png');
      expect(copied.createdBy).toBe(3);
      expect(copied.fileName).not.toBe('private-source.png');
      expect(written).toEqual(data);
      expect(em.persistAndFlush).toHaveBeenCalledWith(copied);
      await expect(service.getByShareableId('copied-share')).rejects.toThrow();
      expect(matting).not.toHaveBeenCalled();
    } finally {
      externalWrite.mockRestore();
      write.mockRestore();
      matting.mockRestore();
    }
  });
});

describe('TEST-015 LocalFileService 私有字节合同', () => {
  const makePrivateStorage = () => {
    jest.clearAllMocks();
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.createReadStream as jest.Mock).mockImplementation(() =>
      Readable.from(Buffer.from('private-byte-fixture')),
    );
    const file = Object.assign(new File(), {
      id: 31,
      fileName: 'private-camera.png',
      shareableId: 'private-share',
      createdBy: { id: 42 },
    });
    const repository = {
      create: jest.fn((data) => Object.assign(new File(), { id: 31 }, data)),
      findOneOrFail: jest.fn().mockResolvedValue(file),
    };
    const em = { persistAndFlush: jest.fn().mockResolvedValue(undefined) };
    const config = {
      getOrThrow: jest.fn(() => 'test-memory-storage'),
      get: jest.fn(),
    };
    const service = new LocalFileService(
      config as any,
      repository as any,
      em as any,
    );
    return { service, repository, em, file };
  };

  it('TEST-015 本地私有图片原字节落盘、保留主人且使用私有名称', async () => {
    const { service, repository, em } = makePrivateStorage();
    const input = await sharp({
      create: { width: 8, height: 8, channels: 3, background: '#663399' },
    })
      .png()
      .toBuffer();
    const write = jest
      .spyOn(fs.promises, 'writeFile')
      .mockResolvedValue(undefined);
    try {
      const save = Reflect.get(service, 'storePrivateImageBuffer');
      expect(save).toEqual(expect.any(Function));
      const stored = await save.call(service, input, 42);

      expect(stored.fileName).toMatch(/^private-/);
      expect(stored.mimetype).toBe('image/png');
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          fileName: stored.fileName,
          createdBy: 42,
        }),
      );
      expect(write).toHaveBeenCalledWith(
        expect.stringContaining(stored.fileName),
        input,
      );
      expect(em.persistAndFlush).toHaveBeenCalledWith(stored);
    } finally {
      write.mockRestore();
    }
  });

  it('TEST-015 私有分享编号不能读取字节，内部按文件名读取仍可用', async () => {
    const { service, file } = makePrivateStorage();

    await expect(service.getByShareableId(file.shareableId)).rejects.toThrow();
    expect(fs.createReadStream).not.toHaveBeenCalled();
    const stream = await service.get(file.fileName);
    expect(await buffer(stream!)).toEqual(Buffer.from('private-byte-fixture'));
  });
});
