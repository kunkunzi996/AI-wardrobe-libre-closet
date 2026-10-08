import { EntityManager } from '@mikro-orm/core';
import { getRepositoryToken } from '@mikro-orm/nestjs';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { File } from '../../dal/entity/file.entity';
import { User } from '../../dal/entity/user.entity';
import { FileService } from '../file-service.abstract';
import { FileController } from './file.controller';
import { AuthService } from '../../auth/auth.service';
import { Readable } from 'node:stream';

describe('FileController', () => {
  let controller: FileController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        JwtModule.register({
          secret: 'dummyaccesstoken',
        }),
      ],
      controllers: [FileController],
      providers: [
        JwtService,
        {
          provide: FileService,
          useValue: {
            storeImageFromFileUpload: jest.fn(),
            delete: jest.fn(),
            deleteById: jest.fn(),
            get: jest.fn(),
            getByShareableId: jest.fn(),
            getWatermark: jest.fn(),
          },
        },
        ConfigService,
        {
          provide: AuthService,
          useValue: { verifyPwf: jest.fn() },
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
          provide: getRepositoryToken(User),
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

    controller = module.get<FileController>(FileController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

describe('TEST-015 FileController 公开绕路保护', () => {
  const makePublicReader = () => {
    const storage = {
      get: jest
        .fn()
        .mockImplementation(() =>
          Promise.resolve(Readable.from(Buffer.from('secret-image'))),
        ),
      getNobgVariant: jest
        .fn()
        .mockImplementation(() =>
          Promise.resolve(Readable.from(Buffer.from('secret-image'))),
        ),
    };
    const controller = new FileController(storage as any, {} as any);
    return { controller, storage };
  };

  it.each([
    'private-camera.png',
    '../private-camera.png',
    '%70rivate-camera.png',
    '%2e%2e%2fprivate-camera.png',
    'nested/private-camera.png',
  ])('TEST-015 公开 file 不接受私有或编码路径：%s', async (fileName) => {
    const { controller, storage } = makePublicReader();

    await expect(controller.getFile(fileName)).rejects.toThrow();
    expect(storage.get).not.toHaveBeenCalled();
  });

  it('TEST-015 nobg 不返回私有字节，也不重定向到私有原图', async () => {
    const { controller, storage } = makePublicReader();
    const reply = {
      header: jest.fn().mockReturnThis(),
      redirect: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };

    await expect(
      controller.nobg('private-camera.png', reply as any),
    ).rejects.toThrow();
    expect(storage.getNobgVariant).not.toHaveBeenCalled();
    expect(reply.send).not.toHaveBeenCalled();
    expect(reply.redirect).not.toHaveBeenCalled();
  });

  it('TEST-015 旧公开文件仍通过既有读取接口', async () => {
    const { controller, storage } = makePublicReader();

    await expect(controller.getFile('legacy.webp')).resolves.toBeInstanceOf(
      Readable,
    );
    expect(storage.get).toHaveBeenCalledWith('legacy.webp');
  });
});
