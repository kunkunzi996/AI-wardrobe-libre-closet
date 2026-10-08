import multipart from '@fastify/multipart';
import { MikroORM } from '@mikro-orm/core';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { BetterSqliteDriver } from '@mikro-orm/better-sqlite';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { buffer } from 'node:stream/consumers';
import sharp from 'sharp';
import { GARMENT_VISION_FETCH } from '../ai/garment-vision.service';
import { OUTFIT_AI_FETCH } from '../ai/outfit-ai.service';
import { GarmentImageService } from '../ai/garment-image.service';
import { GarmentImageNormalization } from '../dal/entity/garment-image-normalization.entity';
import { File } from '../dal/entity/file.entity';
import { Garment } from '../dal/entity/garment.entity';
import { User } from '../dal/entity/user.entity';
import { FileService } from '../file/file-service.abstract';
import { LocalFileService } from '../file/local-file/local-file.service';
import { TENCENT_WEATHER_FETCH } from '../weather/tencent-weather.service';
import { WardrobeModule } from './wardrobe.module';
import { GarmentService } from './garment.service';
import { GarmentImageNormalizationService } from './garment-image-normalization.service';
import { GarmentImageNormalizationWorker } from './garment-image-normalization.worker';
import { OutfitGeneratorService } from './recommendation/outfit-generator.service';
import { CalendarService } from './calendar.service';

describe('衣物整理真实 HTTP 边界（按 TEST 编号筛选）', () => {
  let app: NestFastifyApplication;
  let orm: MikroORM;
  let owner: User;
  let otherOwner: User;
  let garment: Garment;
  let photo: File;
  let ownerToken: string;
  let otherToken: string;
  let cameraBytes: Buffer;
  let cutoutBytes: Buffer;
  let matting: jest.SpyInstance;
  let authEnabled = true;

  // 只替换外部字节存储；Controller、业务服务、ORM 和 JWT 均是真实实现。
  // 此目录不会被创建，所有写入均保存在下面的内存 Map 中。
  const storageRoot = path.resolve(process.cwd(), '.test-only-image-storage');
  const storedBytes = new Map<string, Buffer>();
  const blockedFetch = jest.fn(() =>
    Promise.reject(new Error('此测试禁止外网及收费模型调用')),
  );
  const config: Record<string, unknown> = {
    ACCESS_TOKEN_SECRET: 'TEST-015-only-not-a-real-secret',
    FILE_STORAGE_TYPE: 'local',
    DATA_PATH: storageRoot,
    OBJECT_STORAGE_ACCESS_KEY_ID: 'test-only',
    OBJECT_STORAGE_SECRET_ACCESS_KEY: 'test-only',
    OBJECT_STORAGE_ENDPOINT: 'http://127.0.0.1:1',
    OBJECT_STORAGE_REGION: 'us-east-1',
    OBJECT_STORAGE_BUCKET_NAME: 'test-only',
    QWEN_IMAGE_ENABLED: false,
  };
  // 同一个真实模块夹具增量验证生成；外部端口永远是假实现。
  let modelResponse: unknown;
  const defaultImageFetch = (_url: unknown, options?: any) => {
    if (options?.method === 'POST') {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(modelResponse),
      });
    }
    return Promise.resolve({
      ok: true,
      status: 200,
      arrayBuffer: () => Promise.resolve(cameraBytes),
      headers: new Headers({ 'content-type': 'image/png' }),
    });
  };
  const imageFetch = jest.fn(defaultImageFetch);
  const testConfig = {
    get: (key: string, fallback?: unknown) =>
      key === 'AUTH_ENABLED' ? authEnabled : (config[key] ?? fallback),
    getOrThrow: (key: string) => {
      if (!(key in config)) throw new Error(`缺少测试配置 ${key}`);
      return config[key];
    },
  };
  const isTestStorage = (filePath: fs.PathLike) =>
    path.resolve(String(filePath)).startsWith(`${storageRoot}${path.sep}`);
  const rolePath = (role: string, version = String(photo.id)) =>
    `/api/miniapp/garments/${garment.id}/photos/${role}?v=${version}`;
  const headers = (token: string) => ({ authorization: `Bearer ${token}` });

  beforeAll(async () => {
    cameraBytes = await sharp({
      create: {
        width: 24,
        height: 32,
        channels: 4,
        background: { r: 20, g: 80, b: 200, alpha: 1 },
      },
    })
      .png()
      .toBuffer();
    cutoutBytes = await sharp(cameraBytes).webp().toBuffer();

    const existsSync = fs.existsSync.bind(fs);
    const createReadStream = fs.createReadStream.bind(fs);
    jest
      .spyOn(LocalFileService.prototype, 'setupDir')
      .mockImplementation(() => {});
    jest
      .spyOn(fs, 'existsSync')
      .mockImplementation((filePath) =>
        isTestStorage(filePath)
          ? storedBytes.has(path.resolve(String(filePath)))
          : existsSync(filePath),
      );
    jest
      .spyOn(fs, 'createReadStream')
      .mockImplementation((filePath, options) => {
        if (!isTestStorage(filePath))
          return createReadStream(filePath, options);
        return Readable.from(
          storedBytes.get(path.resolve(String(filePath)))!,
        ) as fs.ReadStream;
      });
    jest
      .spyOn(fs.promises, 'writeFile')
      .mockImplementation((filePath, data) => {
        // 不回落到磁盘写入，出现越界路径是夹具错误而不是业务红灯。
        if (!isTestStorage(filePath as fs.PathLike)) {
          return Promise.reject(new Error('测试存储写入越界'));
        }
        storedBytes.set(
          path.resolve(String(filePath)),
          Buffer.from(data as Uint8Array),
        );
        return Promise.resolve();
      });
    jest
      .spyOn(LocalFileService.prototype as any, 'store')
      .mockImplementation(async (fileName: unknown, stream: unknown) => {
        storedBytes.set(
          path.join(storageRoot, String(fileName)),
          await buffer(stream as Readable),
        );
      });
    matting = jest
      .spyOn(FileService.prototype as any, 'removeBackgroundWithAliyun')
      .mockResolvedValue(cutoutBytes);
    jest
      .spyOn(FileService.prototype, 'getWatermark')
      .mockResolvedValue(cameraBytes);
    jest.spyOn(globalThis, 'fetch').mockImplementation(blockedFetch);

    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          ignoreEnvVars: true,
        }),
        MikroOrmModule.forRoot({
          driver: BetterSqliteDriver,
          dbName: ':memory:',
          autoLoadEntities: true,
          allowGlobalContext: true,
        }),
        WardrobeModule,
      ],
    })
      .overrideProvider(ConfigService)
      .useValue(testConfig)
      .overrideProvider(GARMENT_VISION_FETCH)
      .useValue(blockedFetch)
      .overrideProvider(OUTFIT_AI_FETCH)
      .useValue(blockedFetch)
      .overrideProvider(TENCENT_WEATHER_FETCH)
      .useValue(blockedFetch)
      .overrideProvider('GARMENT_IMAGE_FETCH')
      .useValue(imageFetch)
      .compile();

    app = moduleRef.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    app.useLogger(false);
    await app.register(multipart);
    orm = app.get(MikroORM);
    await orm.schema.createSchema();
    await app.init();
    // 用例显式驱动真实 Worker；不让启动轮询跨用例处理下一份数据库夹具。
    app.get(GarmentImageNormalizationWorker).onModuleDestroy();
    await app.getHttpAdapter().getInstance().ready();
  });

  beforeEach(async () => {
    authEnabled = true;
    matting.mockClear();
    blockedFetch.mockClear();
    storedBytes.clear();
    config.QWEN_IMAGE_ENABLED = false;
    imageFetch.mockReset().mockImplementation(defaultImageFetch);
    modelResponse = {
      request_id: 'request-test-016',
      output: {
        choices: [
          {
            message: {
              content: [{ image: 'https://images.invalid/result.png' }],
            },
          },
        ],
      },
      usage: { input_image_count: 1, output_image_count: 1 },
    };
    await orm.schema.clearDatabase();
    orm.em.clear();
    owner = orm.em.create(User, {
      password: 'test-owner-password-11111111',
      nickname: '测试主人甲',
    });
    otherOwner = orm.em.create(User, {
      password: 'test-owner-password-22222222',
      nickname: '测试主人乙',
    });
    await orm.em.persistAndFlush([owner, otherOwner]);
    photo = orm.em.create(File, {
      fileName: 'private-test-camera.png',
      mimetype: 'image/png',
      createdOn: new Date().toISOString(),
      createdBy: owner.id,
    });
    garment = orm.em.create(Garment, {
      name: '测试衣物',
      category: 'tops',
      photo,
      owner: owner.id,
    });
    await orm.em.persistAndFlush(garment);
    storedBytes.set(path.join(storageRoot, photo.fileName), cameraBytes);
    storedBytes.set(
      path.join(storageRoot, 'private-test-camera-nobg.png'),
      cutoutBytes,
    );
    const jwt = app.get(JwtService);
    ownerToken = jwt.sign({ userId: owner.id, pwf: owner.password.slice(-8) });
    otherToken = jwt.sign({
      userId: otherOwner.id,
      pwf: otherOwner.password.slice(-8),
    });
  });

  afterEach(() => {
    expect(blockedFetch).not.toHaveBeenCalled();
  });

  afterAll(async () => {
    if (app) await app.close();
    jest.restoreAllMocks();
  });

  const expectOwnedDisplay = async () => {
    // 先证实已有路径和真实 JWT 可工作，不能把应用未启动当权限隔离成功。
    const detail = await app.inject({
      method: 'GET',
      url: `/api/miniapp/garments/${garment.id}`,
      headers: headers(ownerToken),
    });
    expect(detail.statusCode).toBe(200);
    const response = await app.inject({
      method: 'GET',
      url: rolePath('display'),
      headers: headers(ownerToken),
    });
    expect(response.statusCode).toBe(200);
    expect(response.rawPayload).toEqual(cameraBytes);
    return response;
  };

  it('TEST-015 新增经真实上传保存原字节，默认图抠一次且不生成', async () => {
    const boundary = 'TEST015MultipartBoundary';
    const payload = Buffer.concat([
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="category"\r\n\r\ntops\r\n`,
      ),
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="name"\r\n\r\n原图测试上衣\r\n`,
      ),
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="photo"; filename="camera.png"\r\nContent-Type: image/png\r\n\r\n`,
      ),
      cameraBytes,
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]);
    const response = await app.inject({
      method: 'POST',
      url: '/api/miniapp/garments',
      payload,
      headers: {
        ...headers(ownerToken),
        'content-type': `multipart/form-data; boundary=${boundary}`,
      },
    });
    expect(response.statusCode).toBe(201);
    const id = response.json().item.id;
    const saved = await orm.em.findOneOrFail(Garment, id);
    const originalPhoto = Reflect.get(saved, 'originalPhoto');
    expect(originalPhoto).toBeDefined();
    expect(originalPhoto!.id).not.toBe(saved.photo!.id);
    const original = await app.inject({
      method: 'GET',
      url: `/api/miniapp/garments/${id}/photos/original?v=${originalPhoto!.id}`,
      headers: headers(ownerToken),
    });
    expect(original.statusCode).toBe(200);
    expect(original.rawPayload).toEqual(cameraBytes);
    expect(original.headers['cache-control']).toBe('private, no-store');
    const originalUrl = `/api/miniapp/garments/${id}/photos/original?v=${originalPhoto!.id}`;
    for (const token of [otherToken, undefined]) {
      const denied = await app.inject({
        method: 'GET',
        url: originalUrl,
        headers: token ? headers(token) : {},
      });
      expect([401, 403, 404]).toContain(denied.statusCode);
      expect(denied.rawPayload).not.toEqual(cameraBytes);
    }
    const publicOriginal = await app.inject({
      method: 'GET',
      url: `/file/${originalPhoto!.fileName}`,
    });
    expect([400, 401, 403, 404]).toContain(publicOriginal.statusCode);
    expect(matting).toHaveBeenCalledTimes(1);
    expect(matting).toHaveBeenCalledWith(cameraBytes);
    expect(
      storedBytes.get(path.join(storageRoot, saved.photo!.fileName)),
    ).toEqual(cutoutBytes);
    expect(blockedFetch).not.toHaveBeenCalled();
  });

  it('TEST-015 主人读取图片带版本并禁止公共缓存，JSON 不暴露私有物理名', async () => {
    const response = await expectOwnedDisplay();
    expect(response.headers['cache-control']).toBe('private, no-store');
    const detail = await app.inject({
      method: 'GET',
      url: `/api/miniapp/garments/${garment.id}`,
      headers: headers(ownerToken),
    });
    expect(
      new URL(detail.json().item.photoUrl).pathname +
        new URL(detail.json().item.photoUrl).search,
    ).toBe(rolePath('display'));
    expect(detail.body).not.toContain(photo.fileName);
  });

  it.each(['another-owner', 'anonymous', 'anonymous-auth-disabled'])(
    'TEST-015 %s 不能获取另一主人的图片字节',
    async (identity) => {
      await expectOwnedDisplay();
      if (identity === 'anonymous-auth-disabled') authEnabled = false;
      const response = await app.inject({
        method: 'GET',
        url: rolePath('display'),
        headers: identity === 'another-owner' ? headers(otherToken) : {},
      });
      expect([401, 403, 404]).toContain(response.statusCode);
      expect(response.rawPayload).not.toEqual(cameraBytes);
      expect(response.headers['location']).toBeUndefined();
    },
  );

  it.each(['missing', 'not-an-id', '0', '999999'])(
    'TEST-015 图片版本 %s 不得读取当前图',
    async (version) => {
      await expectOwnedDisplay();
      const url =
        version === 'missing'
          ? `/api/miniapp/garments/${garment.id}/photos/display`
          : rolePath('display', version);
      const response = await app.inject({
        method: 'GET',
        url,
        headers: headers(ownerToken),
      });
      expect(response.statusCode).toBe(404);
      expect(response.rawPayload).not.toEqual(cameraBytes);
    },
  );

  it.each(['file', 'nobg', 'watermark', 'encoded-private', 'encoded-path'])(
    'TEST-015 公开 %s 入口不能绕过私有图片权限',
    async (entry) => {
      const urls: Record<string, string> = {
        file: `/file/${photo.fileName}`,
        nobg: `/file/nobg/${photo.fileName}`,
        watermark: `/file/watermark/${photo.shareableId}`,
        'encoded-private': `/file/%70rivate-test-camera.png`,
        'encoded-path': `/file/%2e%2fprivate-test-camera.png`,
      };
      const response = await app.inject({ method: 'GET', url: urls[entry] });
      expect([400, 401, 403, 404]).toContain(response.statusCode);
      expect(response.rawPayload).not.toEqual(cameraBytes);
      expect(response.rawPayload).not.toEqual(cutoutBytes);
      expect(response.headers['location']).toBeUndefined();
    },
  );

  it.each(['stale-version', 'other-owner-version'])(
    'TEST-015 已存在的 %s 不能替代衣物当前图片版本',
    async (version) => {
      await expectOwnedDisplay();
      const wrongPhoto = orm.em.create(File, {
        fileName: `private-${version}.png`,
        mimetype: 'image/png',
        createdOn: new Date().toISOString(),
        createdBy: version === 'stale-version' ? owner.id : otherOwner.id,
      });
      await orm.em.persistAndFlush(wrongPhoto);
      storedBytes.set(path.join(storageRoot, wrongPhoto.fileName), cameraBytes);
      const response = await app.inject({
        method: 'GET',
        url: rolePath('display', String(wrongPhoto.id)),
        headers: headers(ownerToken),
      });
      expect(response.statusCode).toBe(404);
      expect(response.rawPayload).not.toEqual(cameraBytes);
    },
  );

  it('TEST-015 历史普通展示图仍可用，原图关系不被伪造回填', async () => {
    photo.fileName = 'legacy-camera.png';
    await orm.em.persistAndFlush(photo);
    storedBytes.set(path.join(storageRoot, photo.fileName), cameraBytes);
    const detail = await app.inject({
      method: 'GET',
      url: `/api/miniapp/garments/${garment.id}`,
      headers: headers(ownerToken),
    });
    expect(detail.statusCode).toBe(200);
    expect(Reflect.get(garment, 'originalPhoto') ?? null).toBeNull();
    const display = await app.inject({
      method: 'GET',
      url: new URL(detail.json().item.photoUrl).pathname,
    });
    expect(display.statusCode).toBe(200);
    expect(display.rawPayload).toEqual(cameraBytes);
  });

  const configureGeneration = () =>
    Object.assign(config, {
      QWEN_IMAGE_ENABLED: true,
      QWEN_IMAGE_MODEL: 'qwen-image-3.0-pro',
      QWEN_IMAGE_API_URL: 'https://model.invalid/generate',
      QWEN_IMAGE_TIMEOUT_MS: 1000,
      QWEN_API_KEY: 'test-image-key-not-real',
    });
  const normalizationUrl = () =>
    `/api/miniapp/garments/${garment.id}/normalization`;
  const withOriginal = async () => {
    const original = orm.em.create(File, {
      fileName: 'private-test-original.png',
      mimetype: 'image/png',
      createdOn: new Date().toISOString(),
      createdBy: owner.id,
    });
    garment.originalPhoto = original;
    await orm.em.persistAndFlush(garment);
    storedBytes.set(path.join(storageRoot, original.fileName), cameraBytes);
    configureGeneration();
  };
  const runWorker = async () => {
    const filename = path.join(
      __dirname,
      'garment-image-normalization.worker.ts',
    );
    const Worker = fs.existsSync(filename)
      ? (await import('./garment-image-normalization.worker'))
          .GarmentImageNormalizationWorker
      : undefined;
    expect(Worker).toEqual(expect.any(Function));
    await app.get(Worker!).runPending();
    orm.em.clear();
  };

  it.each([
    ['tops', ['衬衫'], '短袖衬衫', '上衣'],
    ['tops', [], 'T恤', '上衣'],
    ['bottoms', ['裤装'], '半身裙', '裤子'],
    ['bottoms', [], '牛仔裤', '裤子'],
    ['bottoms', ['半身裙'], '长裤', '半身裙'],
    ['bottoms', [], '百褶裙', '半身裙'],
    ['dresses', ['连衣裙'], '碎花连衣裙', '连衣裙'],
    ['outerwear', ['夹克'], '短外套', '外套'],
  ])(
    'TEST-016 %s %j %s 根据已确认分类生成一张 %s，ready 不换 photo',
    async (category, structured, subcategory, family) => {
      await withOriginal();
      garment.category = String(category);
      garment.taxonomyTags = { category: structured as string[] };
      garment.subcategory = String(subcategory);
      garment.brand = '不得拼入提示词的品牌';
      await orm.em.persistAndFlush(garment);
      const photoId = garment.photo!.id;
      const started = await app.inject({
        method: 'POST',
        url: normalizationUrl(),
        headers: headers(ownerToken),
        payload: {
          attemptKey: 'test-016-attempt',
          prompt: '不能使用客户端自由提示词',
        },
      });
      expect(started.statusCode).toBe(201);
      expect(started.json().item).toMatchObject({
        status: 'queued',
        family,
        canStart: false,
        adopted: false,
      });
      expect(imageFetch).not.toHaveBeenCalled();
      await runWorker();
      const result = await app.inject({
        method: 'GET',
        url: normalizationUrl(),
        headers: headers(ownerToken),
      });
      expect(result.statusCode).toBe(200);
      const view = result.json().item;
      expect(view).toMatchObject({
        status: 'ready',
        family,
        canStart: false,
        adopted: false,
        canAdopt: true,
      });
      expect(view.candidatePhotoUrl).toMatch(/\/photos\/candidate\?v=\d+$/);
      expect(result.body).not.toContain('images.invalid');
      expect(result.body).not.toContain('private-');
      expect(result.body).not.toContain('test-image-key');
      expect(
        imageFetch.mock.calls.filter(
          ([, options]) => options?.method === 'POST',
        ),
      ).toHaveLength(1);
      const body = JSON.parse(
        imageFetch.mock.calls.find(
          ([, options]) => options?.method === 'POST',
        )![1].body,
      );
      expect(body.input.messages[0].content[1].text).not.toContain('品牌');
      expect(body.input.messages[0].content[1].text).not.toContain('客户端');
      const saved = await orm.em.findOneOrFail(Garment, garment.id);
      expect(saved.photo!.id).toBe(photoId);
      expect(saved.brand).toBe('不得拼入提示词的品牌');
      const candidate = await app.inject({
        method: 'GET',
        url:
          new URL(view.candidatePhotoUrl).pathname +
          new URL(view.candidatePhotoUrl).search,
        headers: headers(ownerToken),
      });
      expect(candidate.statusCode).toBe(200);
      expect(candidate.rawPayload).toEqual(cameraBytes);
      const denied = await app.inject({
        method: 'GET',
        url:
          new URL(view.candidatePhotoUrl).pathname +
          new URL(view.candidatePhotoUrl).search,
        headers: headers(otherToken),
      });
      expect([401, 403, 404]).toContain(denied.statusCode);
    },
  );

  it.each([
    ['bottoms', [], ''],
    ['bottoms', ['裤装', '半身裙'], ''],
    ['bottoms', ['连体装'], '短裤'],
    ['bottoms', [], '裙裤'],
    ['footwear', ['鞋履'], '运动鞋'],
    ['bags', ['包袋'], '包'],
    ['accessories', ['首饰'], ''],
    ['other', [], ''],
  ])(
    'TEST-016 未知或冲突 %s %j %s 不猜、不识图、不调用模型',
    async (category, structured, subcategory) => {
      await withOriginal();
      garment.category = String(category);
      garment.taxonomyTags = { category: structured as string[] };
      garment.subcategory = String(subcategory);
      await orm.em.persistAndFlush(garment);
      const current = await app.inject({
        method: 'GET',
        url: normalizationUrl(),
        headers: headers(ownerToken),
      });
      expect(current.statusCode).toBe(200);
      expect(current.json().item).toMatchObject({
        status: 'idle',
        canStart: false,
        family: null,
      });
      const started = await app.inject({
        method: 'POST',
        url: normalizationUrl(),
        headers: headers(ownerToken),
        payload: { attemptKey: 'test-016-unsupported' },
      });
      expect(started.statusCode).toBe(400);
      expect(imageFetch).not.toHaveBeenCalled();
      expect(blockedFetch).not.toHaveBeenCalled();
    },
  );

  it('TEST-016 缺原图、匿名、他人及非法 attemptKey 不开始任务', async () => {
    const idle = await app.inject({
      method: 'GET',
      url: normalizationUrl(),
      headers: headers(ownerToken),
    });
    expect(idle.statusCode).toBe(200);
    expect(idle.json().item).toMatchObject({ status: 'idle', canStart: false });
    expect(idle.json().item.message).toMatch(/原图/);
    await withOriginal();
    const invalidRequests: Array<[string | undefined, unknown]> = [
      [undefined, 'test-016-anon'],
      [otherToken, 'test-016-other'],
      [ownerToken, ''],
      [ownerToken, { forged: true }],
    ];
    for (const [token, key] of invalidRequests) {
      const res = await app.inject({
        method: 'POST',
        url: normalizationUrl(),
        headers: token ? headers(token) : {},
        payload: { attemptKey: key },
      });
      expect([400, 401, 403, 404]).toContain(res.statusCode);
    }
    expect(imageFetch).not.toHaveBeenCalled();
  });

  const attempt = (number: number) =>
    `${(1700000000000 + number).toString(36)}_attempt${number}`;
  const startAttempt = (key = attempt(1)) =>
    app.inject({
      method: 'POST',
      url: normalizationUrl(),
      headers: headers(ownerToken),
      payload: { attemptKey: key },
    });
  const currentAttempt = async () => {
    const res = await app.inject({
      method: 'GET',
      url: normalizationUrl(),
      headers: headers(ownerToken),
    });
    expect(res.statusCode).toBe(200);
    return res.json().item;
  };
  const generationCount = () =>
    imageFetch.mock.calls.filter(([, options]) => options?.method === 'POST')
      .length;
  const peer = () => {
    const tasks = new GarmentImageNormalizationService(
      orm.em.fork(),
      app.get(GarmentService),
      app.get(GarmentImageService),
      app.get(FileService),
    );
    return {
      tasks,
      worker: new GarmentImageNormalizationWorker(
        orm,
        tasks,
        app.get(GarmentImageService),
        app.get(FileService),
      ),
    };
  };
  const startup = async (worker: GarmentImageNormalizationWorker) => {
    // 必须走 Nest 真正调用的启动钩子，不能用无配置门限的辅助入口代替。
    const background = jest.spyOn(worker, 'runPending');
    try {
      await worker.onApplicationBootstrap();
      // 启动本身不等待模型；测试显式等待它实际派发的这一轮后台工作。
      for (const result of background.mock.results) await result.value;
      orm.em.clear();
    } finally {
      worker.onModuleDestroy();
      background.mockRestore();
    }
  };

  it('TEST-018 关闭新生成后真实启动仍恢复已派发状态，零生成', async () => {
    await withOriginal();
    await startAttempt();
    expect(await peer().tasks.claimQueued()).not.toBeNull();
    expect((await currentAttempt()).status).toBe('processing');
    config.QWEN_IMAGE_ENABLED = false;
    await startup(peer().worker);
    const view = await currentAttempt();
    expect(view).toMatchObject({ status: 'uncertain', canStart: false });
    expect(view.message).toMatch(/可能.*费用/);
    expect(imageFetch).not.toHaveBeenCalled();
  });

  it('TEST-018 关闭新生成后真实启动仍下载已存结果，零重投', async () => {
    await withOriginal();
    await startAttempt();
    let downloads = 0;
    imageFetch.mockImplementation(async (url, options) => {
      if (options?.method === 'POST') return defaultImageFetch(url, options);
      if (++downloads === 1) throw new Error('首次结果下载断网');
      return defaultImageFetch(url, options);
    });
    await runWorker();
    expect((await currentAttempt()).status).toBe('uncertain');
    expect(generationCount()).toBe(1);
    config.QWEN_IMAGE_ENABLED = false;
    await startup(peer().worker);
    expect((await currentAttempt()).status).toBe('ready');
    expect(downloads).toBe(2);
    expect(generationCount()).toBe(1);
  });

  it('TEST-018 关闭新生成后真实启动不领取 queued，重新开启才首次生成', async () => {
    await withOriginal();
    await startAttempt();
    config.QWEN_IMAGE_ENABLED = false;
    const worker = peer().worker;
    await startup(worker);
    expect((await currentAttempt()).status).toBe('queued');
    expect(imageFetch).not.toHaveBeenCalled();
    configureGeneration();
    await worker.runPending();
    expect((await currentAttempt()).status).toBe('ready');
    expect(generationCount()).toBe(1);
  });

  it('TEST-018 相同与不同 key 并发开始、两个 Worker 只领取和派发一次', async () => {
    await withOriginal();
    const starts = await Promise.all([
      startAttempt(),
      startAttempt(),
      startAttempt(attempt(2)),
    ]);
    starts.forEach((res) => expect(res.statusCode).toBe(201));
    expect(new Set(starts.map((res) => res.json().item.attemptKey)).size).toBe(
      1,
    );
    expect(
      await orm.em
        .fork()
        .count(GarmentImageNormalization, { garment: garment.id }),
    ).toBe(1);
    await Promise.all([peer().worker.runPending(), peer().worker.runPending()]);
    expect((await currentAttempt()).status).toBe('ready');
    expect(generationCount()).toBe(1);
    await startAttempt(attempt(3));
    await runWorker();
    expect(generationCount()).toBe(1);
  });

  it('TEST-018 queued 服务重建后仍可领取，安全启动只派发原次一次', async () => {
    await withOriginal();
    await startAttempt();
    expect((await currentAttempt()).status).toBe('queued');
    expect(generationCount()).toBe(0);
    await startup(peer().worker);
    expect((await currentAttempt()).status).toBe('ready');
    expect(generationCount()).toBe(1);
  });

  it('TEST-018 已派发进程中断后保守未知，不发第二次 POST', async () => {
    await withOriginal();
    await startAttempt();
    let reject!: (error: Error) => void;
    let beganResolve!: () => void;
    const began = new Promise<void>((resolve) => {
      beganResolve = resolve;
    });
    imageFetch.mockImplementationOnce(
      async () =>
        new Promise((_, fail) => {
          reject = fail;
          beganResolve();
        }),
    );
    const running = peer().worker.runPending();
    try {
      await began;
      expect(generationCount()).toBe(1);
      expect((await currentAttempt()).status).toBe('processing');
      await startup(peer().worker);
      const view = await currentAttempt();
      expect(view).toMatchObject({ status: 'uncertain', canStart: false });
      expect(view.message).toMatch(/可能.*费用/);
      expect(generationCount()).toBe(1);
    } finally {
      if (reject) reject(new Error('模拟旧进程消失'));
      await running;
    }
  });

  it('TEST-018 下载失败只恢复已记录的同图下载，不再生成', async () => {
    await withOriginal();
    await startAttempt();
    let downloads = 0;
    imageFetch.mockImplementation(async (url, options) => {
      if (options?.method === 'POST') return defaultImageFetch(url, options);
      if (++downloads === 1) throw new Error('测试下载断网');
      return defaultImageFetch(url, options);
    });
    await runWorker();
    expect((await currentAttempt()).status).toBe('uncertain');
    const saved = await orm.em
      .fork()
      .findOneOrFail(GarmentImageNormalization, { garment: garment.id });
    expect(saved.resultUrl).toBe('https://images.invalid/result.png');
    expect(generationCount()).toBe(1);
    await startup(peer().worker);
    expect((await currentAttempt()).status).toBe('ready');
    expect(downloads).toBe(2);
    expect(generationCount()).toBe(1);
  });

  it('TEST-018 网络不明与明确 failed 区分；failed 只允许新手动尝试，旧 key 不重投', async () => {
    await withOriginal();
    await startAttempt();
    modelResponse = {
      code: 'InvalidParameter',
      request_id: 'explicit-rejection',
    };
    await runWorker();
    expect(await currentAttempt()).toMatchObject({
      status: 'failed',
      canStart: true,
    });
    await startAttempt();
    await runWorker();
    expect(generationCount()).toBe(1);
    const next = await startAttempt(attempt(2));
    expect(next.json().item).toMatchObject({
      status: 'queued',
      attemptKey: attempt(2),
    });
    await runWorker();
    expect(generationCount()).toBe(2);
    await startAttempt(attempt(1));
    await runWorker();
    expect(generationCount()).toBe(2);
    const third = await startAttempt(attempt(3));
    expect(third.json().item.status).toBe('queued');
    imageFetch.mockImplementationOnce(() =>
      Promise.reject(new Error('测试网络失联')),
    );
    await runWorker();
    expect(await currentAttempt()).toMatchObject({
      status: 'uncertain',
      canStart: false,
    });
    await startAttempt(attempt(4));
    await runWorker();
    expect(generationCount()).toBe(3);
  });

  it('TEST-018 原次晚到响应不能覆盖新尝试，条件回写必须带记录及 attempt', async () => {
    await withOriginal();
    await startAttempt();
    const tasks = app.get(GarmentImageNormalizationService);
    const old = (await tasks.claimQueued())!;
    expect(old).toBeTruthy();
    await tasks.markFailed(old, 'CONFIRMED_REJECTION');
    const next = await startAttempt(attempt(2));
    expect(next.json().item.status).toBe('queued');
    const fresh = await tasks.claimQueued();
    expect(fresh!.attemptKey).toBe(attempt(2));
    expect(
      await tasks.saveProviderResult(old, {
        requestId: 'late',
        imageUrl: 'https://images.invalid/late.png',
        usage: { input_image_count: 1, output_image_count: 1 },
      }),
    ).toBe(false);
    expect(await tasks.completeCandidate(old, photo.id)).toBe(false);
    expect(await currentAttempt()).toMatchObject({
      status: 'processing',
      attemptKey: attempt(2),
      candidatePhotoUrl: '',
    });
    expect(generationCount()).toBe(0);
  });

  it('TEST-018 删除衣物后晚到结果不回写、不产生新任务', async () => {
    await withOriginal();
    await startAttempt();
    const tasks = app.get(GarmentImageNormalizationService);
    const old = (await tasks.claimQueued())!;
    const deleted = await app.inject({
      method: 'DELETE',
      url: `/api/miniapp/garments/${garment.id}`,
      headers: headers(ownerToken),
    });
    expect(deleted.statusCode).toBe(200);
    expect(
      await tasks.saveProviderResult(old, {
        requestId: 'late',
        imageUrl: 'https://images.invalid/late.png',
        usage: { input_image_count: 1, output_image_count: 1 },
      }),
    ).toBe(false);
    expect(
      await orm.em
        .fork()
        .count(GarmentImageNormalization, { garment: garment.id }),
    ).toBe(0);
  });

  const readyCandidate = async () => {
    await withOriginal();
    garment.brand = '资料不能改';
    garment.notes = '保留备注';
    garment.taxonomyTags = { category: ['衬衫'], style: ['休闲'] };
    await orm.em.flush();
    await startAttempt();
    await runWorker();
    const view = await currentAttempt();
    expect(view.status).toBe('ready');
    return view;
  };
  const adopt = (key: string, token = ownerToken, extra = {}) =>
    app.inject({
      method: 'POST',
      url: `/api/miniapp/garments/${garment.id}/normalization/adopt`,
      headers: headers(token),
      payload: { attemptKey: key, ...extra },
    });

  it('TEST-020 明确采用只改当前 photo；原图、固定输入、旧字节、资料与主人不变', async () => {
    const view = await readyCandidate();
    const em = orm.em.fork();
    const before = await em.findOneOrFail(Garment, garment.id);
    const fields = (item: Garment) => ({
      name: item.name,
      brand: item.brand,
      notes: item.notes,
      category: item.category,
      taxonomyTags: item.taxonomyTags,
      owner: item.owner!.id,
      original: item.originalPhoto!.id,
    });
    const originalFields = fields(before);
    expect(before.photo!.id).toBe(photo.id);
    const count = generationCount();
    const result = await adopt(view.attemptKey);
    expect(result.statusCode).toBe(201);
    expect(Object.keys(result.json())).toEqual(['item']);
    em.clear();
    const after = await em.findOneOrFail(Garment, garment.id);
    const record = await em.findOneOrFail(GarmentImageNormalization, {
      garment: garment.id,
    });
    expect(after.photo!.id).toBe(record.candidatePhoto!.id);
    expect(fields(after)).toEqual(originalFields);
    expect(record.sourcePhoto.id).toBe(photo.id);
    expect(storedBytes.get(path.join(storageRoot, photo.fileName))).toEqual(
      cameraBytes,
    );
    expect(result.json().item.photoUrl).toMatch(
      new RegExp(`/photos/display\\?v=${after.photo!.id}$`),
    );
    expect(await currentAttempt()).toMatchObject({
      adopted: true,
      canAdopt: false,
      status: 'ready',
    });
    expect(generationCount()).toBe(count);
    expect(matting).not.toHaveBeenCalled();
  });

  it('TEST-020 重复采用幂等，旧版本拒绝，新列表/详情指向相同当前图', async () => {
    const view = await readyCandidate();
    const first = await adopt(view.attemptKey);
    expect(first.statusCode).toBe(201);
    const second = await adopt(view.attemptKey);
    expect(second.statusCode).toBe(201);
    expect(second.json().item.photoUrl).toBe(first.json().item.photoUrl);
    const list = await app.inject({
      method: 'GET',
      url: '/api/miniapp/garments',
      headers: headers(ownerToken),
    });
    const detail = await app.inject({
      method: 'GET',
      url: `/api/miniapp/garments/${garment.id}`,
      headers: headers(ownerToken),
    });
    expect(list.json().items[0].photoUrl).toBe(first.json().item.photoUrl);
    expect(detail.json().item.photoUrl).toBe(first.json().item.photoUrl);
    const currentUrl = new URL(first.json().item.photoUrl);
    const image = await app.inject({
      method: 'GET',
      url: currentUrl.pathname + currentUrl.search,
      headers: headers(ownerToken),
    });
    expect(image.statusCode).toBe(200);
    expect(image.rawPayload).toEqual(cameraBytes);
    expect(
      (
        await app.inject({
          method: 'GET',
          url: rolePath('display'),
          headers: headers(ownerToken),
        })
      ).statusCode,
    ).toBe(404);
    expect(generationCount()).toBe(1);
  });

  it.each(['anonymous', 'other-owner', 'old-attempt'])(
    'TEST-020 %s 不得采用，不改变旧图',
    async (kind) => {
      const view = await readyCandidate();
      const result =
        kind === 'anonymous'
          ? await app.inject({
              method: 'POST',
              url: `/api/miniapp/garments/${garment.id}/normalization/adopt`,
              payload: { attemptKey: view.attemptKey },
            })
          : await adopt(
              kind === 'old-attempt' ? 'old-attempt' : view.attemptKey!,
              kind === 'other-owner' ? otherToken : ownerToken,
            );
      expect(result.statusCode).toBe(
        kind === 'anonymous' ? 401 : kind === 'other-owner' ? 403 : 409,
      );
      expect(
        (await orm.em.fork().findOneOrFail(Garment, garment.id)).photo!.id,
      ).toBe(photo.id);
      expect(generationCount()).toBe(1);
    },
  );

  it('TEST-020 Owner 公开采用方法拒绝任意他人 File；失败不删除照片', async () => {
    await readyCandidate();
    const foreign = orm.em.create(File, {
      fileName: 'private-other.png',
      createdBy: otherOwner.id,
      createdOn: new Date().toISOString(),
      mimetype: 'image/png',
    });
    await orm.em.persistAndFlush(foreign);
    const service = app.get(GarmentService);
    expect(typeof Reflect.get(service, 'adoptNormalizedPhoto')).toBe(
      'function',
    );
    await expect(
      Reflect.get(service, 'adoptNormalizedPhoto').call(
        service,
        garment.id,
        owner.id,
        foreign.id,
        photo.id,
      ),
    ).rejects.toMatchObject({ status: 403 });
    expect(
      (await orm.em.fork().findOneOrFail(Garment, garment.id)).photo!.id,
    ).toBe(photo.id);
    expect(storedBytes.has(path.join(storageRoot, photo.fileName))).toBe(true);
  });

  it('TEST-020 整理期间当前图已改变时拒绝条件切图，保留新编辑图及候选', async () => {
    const view = await readyCandidate();
    const replacement = orm.em.create(File, {
      fileName: 'private-edited.png',
      createdBy: owner.id,
      createdOn: new Date().toISOString(),
      mimetype: 'image/png',
    });
    garment.photo = replacement;
    await orm.em.persistAndFlush(garment);
    const result = await adopt(view.attemptKey);
    expect(result.statusCode).toBe(409);
    expect(
      (await orm.em.fork().findOneOrFail(Garment, garment.id)).photo!.id,
    ).toBe(replacement.id);
    expect(await currentAttempt()).toMatchObject({
      status: 'ready',
      adopted: false,
    });
    expect(generationCount()).toBe(1);
  });

  it('TEST-020 采用写入失败时旧图仍可读，候选仍可再次明确采用', async () => {
    const view = await readyCandidate();
    const service = app.get(GarmentService);
    expect(typeof Reflect.get(service, 'adoptNormalizedPhoto')).toBe(
      'function',
    );
    const failed = jest
      .spyOn(service as any, 'adoptNormalizedPhoto')
      .mockRejectedValueOnce(new Error('测试写库失败'));
    try {
      expect((await adopt(view.attemptKey)).statusCode).toBe(500);
      expect((await currentAttempt()).canAdopt).toBe(true);
      expect(
        (
          await app.inject({
            method: 'GET',
            url: rolePath('display'),
            headers: headers(ownerToken),
          })
        ).rawPayload,
      ).toEqual(cameraBytes);
      expect(generationCount()).toBe(1);
    } finally {
      failed.mockRestore();
    }
  });

  it('TEST-020 采用后真实推荐和今日穿搭出口同图，读图不产生模型 POST', async () => {
    const view = await readyCandidate();
    const result = await adopt(view.attemptKey);
    expect(result.statusCode).toBe(201);
    const expected = result.json().item.photoUrl;
    const current = await orm.em.fork().findOneOrFail(Garment, garment.id);
    const generator = jest
      .spyOn(app.get(OutfitGeneratorService), 'generateWithAi')
      .mockResolvedValueOnce({
        plans: [
          {
            title: '固定方案',
            reason: '不改理由',
            cautions: [],
            garments: [current],
          },
        ],
      } as any);
    const calendar = jest
      .spyOn(app.get(CalendarService), 'findWeek')
      .mockResolvedValueOnce({
        days: [
          {
            date: new Date('2026-10-06T00:00:00Z'),
            entries: [
              {
                id: 21,
                date: new Date('2026-10-06T00:00:00Z'),
                outfit: {
                  unwrap: () => ({
                    id: 31,
                    name: '旧穿搭',
                    garments: { getItems: () => [current] },
                  }),
                },
              },
            ],
          },
        ],
      } as any);
    try {
      const recommended = await app.inject({
        method: 'POST',
        url: '/api/miniapp/outfits/recommend',
        headers: headers(ownerToken),
        payload: { weather: { mode: 'unavailable' } },
      });
      expect(recommended.statusCode).toBe(201);
      expect(recommended.json().recommendations[0].garments[0].photoUrl).toBe(
        expected,
      );
      const today = await app.inject({
        method: 'GET',
        url: '/api/miniapp/daily-outfits/today?date=2026-10-06',
        headers: headers(ownerToken),
      });
      expect(today.statusCode).toBe(200);
      expect(today.json().items[0].outfit.garments[0].photoUrl).toBe(expected);
      expect(generationCount()).toBe(1);
    } finally {
      generator.mockRestore();
      calendar.mockRestore();
    }
  });

  it('TEST-020 未 ready 不可采用，采用不能开始或重新生成', async () => {
    await withOriginal();
    const started = await startAttempt();
    expect((await adopt(started.json().item.attemptKey)).statusCode).toBe(409);
    expect((await currentAttempt()).status).toBe('queued');
    expect(generationCount()).toBe(0);
  });
});
