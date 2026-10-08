import { Garment } from '../dal/entity/garment.entity';
import { GarmentColor } from './garment-color.enum';
import { GarmentStatus } from './garment-status.enum';
import { MiniappWardrobeController } from './miniapp-wardrobe.controller';
import { Readable } from 'node:stream';
import { buffer } from 'node:stream/consumers';
import { MikroORM } from '@mikro-orm/core';
import { BetterSqliteDriver } from '@mikro-orm/better-sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { File } from '../dal/entity/file.entity';
import { User } from '../dal/entity/user.entity';
import { GarmentImageNormalization } from '../dal/entity/garment-image-normalization.entity';
import { GarmentService } from './garment.service';
import { GarmentImageNormalizationService } from './garment-image-normalization.service';

// 只借用真实 ZIP 编解码；图片转移与引用恢复走公开 Owner，外部存储为内存。
describe('TEST-022 新旧备份真实 Owner 图片往返', () => {
  let orm: MikroORM,
    controller: MiniappWardrobeController,
    garments: GarmentService;
  let tasks: GarmentImageNormalizationService, owner: User, target: User;
  let files: any, source: Garment, original: File, input: File, candidate: File;
  const bytes = new Map<string, Buffer>();
  const images = {
    isConfigured: () => true,
    promptVersion: '20261006-v1',
    model: 'qwen-image-3.0-pro',
    generate: jest.fn(),
  };
  const transferPath = path.join(__dirname, 'garment-image-transfer.service');
  let Transfer: any;
  beforeAll(async () => {
    Transfer = fs.existsSync(transferPath + '.ts')
      ? (await import('./garment-image-transfer.service'))
          .GarmentImageTransferService
      : undefined;
    orm = await MikroORM.init({
      driver: BetterSqliteDriver,
      dbName: ':memory:',
      allowGlobalContext: true,
      entities: [path.join(__dirname, '../dal/entity/*.entity.ts')],
    });
    await orm.schema.createSchema();
  });
  afterAll(async () => {
    if (orm) await orm.close();
  });
  beforeEach(async () => {
    await orm.schema.clearDatabase();
    orm.em.clear();
    bytes.clear();
    images.generate.mockClear();
    owner = orm.em.create(User, {
      password: 'test-password-11111111',
      nickname: '源主人',
    });
    target = orm.em.create(User, {
      password: 'test-password-22222222',
      nickname: '目标主人',
    });
    await orm.em.persistAndFlush([owner, target]);
    let next = 0;
    files = {
      get: jest.fn((name: string) => {
        if (!bytes.has(name)) return Promise.reject(new Error('缺少字节'));
        return Promise.resolve(Readable.from(bytes.get(name)!));
      }),
      storePrivateImageBuffer: jest.fn(async (data: Buffer, userId: number) => {
        const file = orm.em.create(File, {
          fileName: `private-import-${++next}.png`,
          mimetype: 'image/png',
          createdBy: userId,
          createdOn: new Date().toISOString(),
        });
        await orm.em.persistAndFlush(file);
        bytes.set(file.fileName, Buffer.from(data));
        return file;
      }),
      storeImageFromFileUpload: jest.fn(async (upload: any, userId: number) =>
        files.storePrivateImageBuffer(await buffer(upload.file), userId),
      ),
    };
    garments = new GarmentService(
      orm.em.getRepository(Garment),
      orm.em.getRepository(File),
      orm.em.getRepository(User),
      files,
    );
    tasks = new GarmentImageNormalizationService(
      orm.em,
      garments,
      images as any,
      files,
    );
    const transfer = Transfer
      ? new Transfer(garments, tasks, files)
      : undefined;
    controller = new (MiniappWardrobeController as any)(
      garments,
      {},
      files,
      transfer,
    );
    original = await files.storePrivateImageBuffer(
      Buffer.from('原始拍照字节'),
      owner.id,
    );
    input = await files.storePrivateImageBuffer(
      Buffer.from('原次抠图字节'),
      owner.id,
    );
    candidate = await files.storePrivateImageBuffer(
      Buffer.from('整理候选字节'),
      owner.id,
    );
    source = orm.em.create(Garment, {
      category: 'tops',
      name: '保持资料',
      brand: '保持品牌',
      photo: input,
      originalPhoto: original,
      owner: owner.id,
      taxonomyTags: { category: ['衬衫'] },
      notes: '保留备注',
    });
    await orm.em.persistAndFlush(source);
  });
  const request = (userId: number, zip?: Buffer) =>
    ({
      user: { userId },
      protocol: 'https',
      host: 'test.invalid',
      file: () =>
        Promise.resolve({
          filename: 'backup.zip',
          mimetype: 'application/zip',
          file: Readable.from(zip!),
        }),
    }) as any;
  const exportZip = async () => {
    let zip!: Buffer;
    const reply = {
      header: jest.fn(),
      send: (data: Buffer) => {
        zip = data;
      },
    };
    await controller.exportBackup(request(owner.id), reply as any);
    const entries = Reflect.get(controller, 'readZip').call(
      controller,
      zip,
    ) as Array<{ name: string; data: Buffer }>;
    return {
      zip,
      entries,
      manifest: JSON.parse(
        entries.find((e) => e.name === 'manifest.json')!.data.toString('utf8'),
      ),
    };
  };
  const setReady = async (adopt = false) => {
    await tasks.start(source.id, owner.id, 'lzztesttime_backup');
    const work = (await tasks.claimQueued())!;
    await tasks.saveProviderResult(work, {
      requestId: 'never-export-me',
      imageUrl: 'https://private-provider.invalid/result.png',
      usage: {},
    });
    await tasks.completeCandidate(work, candidate.id);
    if (adopt) await tasks.adopt(source.id, owner.id, work.attemptKey);
    orm.em.clear();
  };

  it.each([false, true])(
    'TEST-022 ready adopted=%s 四角色原字节往返，候选/当前相同 File 去重且输入仍独立',
    async (adopted) => {
      await setReady(adopted);
      const exported = await exportZip();
      expect(exported.manifest.backupVersion).toBe(3);
      const item = exported.manifest.garments[0];
      expect(item.originalPhoto).toEqual(expect.any(String));
      expect(item.normalizationSnapshot).toMatchObject({
        status: 'ready',
        promptFamily: '上衣',
        promptVersion: '20261006-v1',
        model: 'qwen-image-3.0-pro',
      });
      expect(item.normalizationSnapshot.sourcePhotoRef).toEqual(
        expect.any(String),
      );
      expect(item.normalizationSnapshot.candidatePhotoRef).toEqual(
        expect.any(String),
      );
      expect(
        exported.entries.filter((e) => e.name !== 'manifest.json'),
      ).toHaveLength(3);
      expect(item.photo).toBe(
        adopted
          ? item.normalizationSnapshot.candidatePhotoRef
          : item.normalizationSnapshot.sourcePhotoRef,
      );
      expect(JSON.stringify(exported.manifest)).not.toMatch(
        /never-export-me|private-provider|requestId|resultUrl|attemptKey|dispatchedAt|createdBy/,
      );
      files.storeImageFromFileUpload.mockClear();
      expect(
        await controller.importBackup(request(target.id, exported.zip)),
      ).toEqual({ imported: 1, skipped: 0 });
      const restored = (await garments.findAll(target.id, {}))[0];
      expect(restored.name).toBe('保持资料');
      expect(restored.brand).toBe('保持品牌');
      expect(restored.originalPhoto!.id).not.toBe(original.id);
      expect(restored.originalPhoto!.createdBy!.id).toBe(target.id);
      expect(
        await buffer(
          (
            await garments.readOwnedPhoto(
              restored.id,
              target.id,
              'original',
              String(restored.originalPhoto!.id),
            )
          ).stream,
        ),
      ).toEqual(Buffer.from('原始拍照字节'));
      const current = await tasks.get(restored.id, target.id);
      expect(current).toMatchObject({
        status: 'ready',
        adopted,
        canStart: false,
      });
      const record = await orm.em
        .fork()
        .findOneOrFail(
          GarmentImageNormalization,
          { garment: restored.id },
          { populate: ['sourcePhoto', 'candidatePhoto'] },
        );
      expect(record.sourcePhoto.getEntity().createdBy!.id).toBe(target.id);
      expect(
        await buffer(await files.get(record.sourcePhoto.getEntity().fileName)),
      ).toEqual(Buffer.from('原次抠图字节'));
      expect(
        await buffer(
          (
            await tasks.getCandidate(
              restored.id,
              target.id,
              String(record.candidatePhoto!.id),
            )
          ).stream,
        ),
      ).toEqual(Buffer.from('整理候选字节'));
      await expect(
        garments.readOwnedPhoto(
          restored.id,
          owner.id,
          'original',
          String(restored.originalPhoto!.id),
        ),
      ).rejects.toThrow();
      expect(files.storeImageFromFileUpload).not.toHaveBeenCalled();
      expect(images.generate).not.toHaveBeenCalled();
    },
  );

  it.each(['queued', 'processing', 'uncertain'])(
    'TEST-022 %s 快照只静态恢复为未知，不能被 Worker 再领取',
    async (status) => {
      await tasks.start(source.id, owner.id, 'lzztesttime_backup');
      if (status !== 'queued') {
        const work = (await tasks.claimQueued())!;
        if (status === 'uncertain')
          await tasks.markUncertain(work, 'NETWORK_UNKNOWN');
      }
      const exported = await exportZip();
      expect(exported.manifest.backupVersion).toBe(3);
      await controller.importBackup(request(target.id, exported.zip));
      const restored = (await garments.findAll(target.id, {}))[0];
      expect(await tasks.get(restored.id, target.id)).toMatchObject({
        status: 'uncertain',
        canStart: false,
      });
      const record = await orm.em
        .fork()
        .findOneOrFail(GarmentImageNormalization, { garment: restored.id });
      expect(record.resultUrl).toBeFalsy();
      expect(record.providerRequestId).toBeFalsy();
      expect(images.generate).not.toHaveBeenCalled();
    },
  );

  it.each(['photo', 'originalPhoto', 'sourcePhotoRef', 'candidatePhotoRef'])(
    'TEST-022 已声明 %s 缺失，完整包预检先拒绝且零目标写入',
    async (role) => {
      await setReady(true);
      const exported = await exportZip();
      const item = exported.manifest.garments[0];
      expect(exported.manifest.backupVersion).toBe(3);
      const ref = role.endsWith('Ref')
        ? item.normalizationSnapshot[role]
        : item[role];
      const zip = Reflect.get(controller, 'buildZip').call(
        controller,
        exported.entries.filter((e) => e.name !== ref),
      );
      const count = files.storePrivateImageBuffer.mock.calls.length;
      await expect(
        controller.importBackup(request(target.id, zip)),
      ).rejects.toThrow(/缺少|不完整/);
      expect(await garments.findAll(target.id, {})).toEqual([]);
      expect(files.storePrivateImageBuffer.mock.calls.length).toBe(count);
    },
  );

  it.each([1, 2])(
    'TEST-022 合法版本 %s 旧包不伪造原图、不再抠图，资料与退役 status 保护保留',
    async (version) => {
      const manifest = {
        backupVersion: version,
        garments: [
          {
            name: '旧照片衣物',
            category: 'tops',
            status: 'archived',
            photo: 'photos/old.png',
            brand: '旧品牌',
          },
        ],
      };
      const zip = Reflect.get(controller, 'buildZip').call(controller, [
        {
          name: 'manifest.json',
          data: Buffer.from(JSON.stringify(manifest), 'utf8'),
        },
        { name: 'photos/old.png', data: Buffer.from('旧展示字节') },
      ]);
      await controller.importBackup(request(target.id, zip));
      const restored = (await garments.findAll(target.id, {}))[0];
      expect(restored.originalPhoto ?? null).toBeNull();
      expect(restored.brand).toBe('旧品牌');
      expect(
        await buffer(
          (
            await garments.readOwnedPhoto(
              restored.id,
              target.id,
              'display',
              String(restored.photo!.id),
            )
          ).stream,
        ),
      ).toEqual(Buffer.from('旧展示字节'));
      expect(restored.status).toBe(GarmentStatus.Wearable);
      expect(files.storeImageFromFileUpload).not.toHaveBeenCalled();
      expect(images.generate).not.toHaveBeenCalled();
    },
  );
});

describe('MiniappWardrobeController', () => {
  const defaultStructuredFields = {
    pocketPresence: 'unknown',
    pocketPosition: 'unknown',
    chestMarkPresence: 'unknown',
    chestMarkType: 'unknown',
    chestMarkPosition: 'unknown',
    chestMarkText: null,
  };

  const makeController = () => {
    const garmentService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      findSimilarToDraft: jest.fn(() => Promise.resolve([])),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };
    const garmentVisionService = {
      analyzeImage: jest.fn(),
      analyzeUpload: jest.fn(),
    };
    const fileService = {
      get: jest.fn(),
    };
    garmentVisionService.analyzeImage.mockResolvedValue({
      fileName: 'coat.webp',
      category: 'tops',
      seasons: [],
      styleTags: [],
      sceneTags: [],
      ...defaultStructuredFields,
      confidence: 0,
      notes: 'AI 识别服务暂不可用，请手动确认衣物信息。',
    });
    const controller = new MiniappWardrobeController(
      garmentService as any,
      garmentVisionService as any,
      fileService as any,
    );
    const req = { protocol: 'https', host: 'aimatchwear.asia' } as any;

    return {
      controller,
      garmentService,
      garmentVisionService,
      fileService,
      req,
    };
  };

  const makeGarment = (overrides: Partial<Garment> = {}) =>
    Object.assign(new Garment(), {
      id: 7,
      name: 'Black Coat',
      category: 'outerwear',
      color: GarmentColor.BLACK,
      status: GarmentStatus.Wearable,
      seasons: ['winter'],
      brand: 'Sample',
      size: 'M',
      notes: 'Warm',
      photo: { fileName: 'coat.webp' },
      ...defaultStructuredFields,
      ...overrides,
    });

  it('TEST-020 列表、详情、重复候选及新增编辑响应统一当前私有图版本，旧公开图不改', async () => {
    const { controller, garmentService, garmentVisionService, req } =
      makeController();
    const current = makeGarment({
      photo: { id: 99, fileName: 'private-normalized.png' } as any,
    });
    garmentService.findAll.mockResolvedValue([current, makeGarment({ id: 8 })]);
    garmentService.findOne.mockResolvedValue(current);
    garmentService.findSimilarToDraft.mockResolvedValue([
      { garment: current, score: 90, reasons: ['同类'] },
    ]);
    garmentService.create.mockResolvedValue(current);
    garmentService.update.mockResolvedValue(current);
    garmentVisionService.analyzeUpload.mockResolvedValue({
      category: 'outerwear',
    });
    req.file = jest.fn().mockResolvedValue({
      mimetype: 'image/png',
      file: Readable.from('测试字节'),
      fields: {},
    });
    const list = await controller.index(req);
    const detail = await controller.show(7, req);
    const duplicate = await controller.analyze(req);
    const created = await controller.create(
      { category: 'outerwear' } as any,
      req,
    );
    const updated = await controller.update(
      7,
      { category: 'outerwear' } as any,
      req,
    );
    const expected =
      'https://aimatchwear.asia/api/miniapp/garments/7/photos/display?v=99';
    for (const item of [
      list.items[0],
      detail.item,
      duplicate.duplicateCandidates[0],
      created.item,
      updated.item,
    ])
      expect(item.photoUrl).toBe(expected);
    expect(list.items[1].photoUrl).toBe(
      'https://aimatchwear.asia/file/coat.webp',
    );
  });

  it('TEST-015 正常新增由服务端指定相机来源，忽略客户端伪造的图片来源', async () => {
    const { controller, garmentService, garmentVisionService, req } =
      makeController();
    req.user = { userId: 42 };
    const upload = {
      mimetype: 'image/jpeg',
      file: Readable.from('test-upload'),
      fields: {},
    };
    req.file = jest.fn().mockResolvedValue(upload);
    garmentService.create.mockResolvedValue(makeGarment());

    await controller.create(
      {
        name: '测试上衣',
        category: 'tops',
        photoSource: 'stored-image',
        originalPhotoFileName: 'another-owner.png',
      } as any,
      req,
    );

    const [dto, userId] = garmentService.create.mock.calls[0];
    expect(userId).toBe(42);
    expect(dto.photo).toBe(upload);
    expect(dto.photoSource).toBe('camera-upload');
    expect(dto).not.toHaveProperty(
      'originalPhotoFileName',
      'another-owner.png',
    );
    expect(garmentVisionService.analyzeImage).not.toHaveBeenCalled();
    expect(garmentVisionService.analyzeUpload).not.toHaveBeenCalled();
  });

  it('returns the fixed garment tag taxonomy for miniapp forms', () => {
    const { controller } = makeController();

    expect(controller.taxonomy()).toEqual({
      groups: expect.arrayContaining([
        expect.objectContaining({ key: 'weather', label: '天气' }),
        expect.objectContaining({
          key: 'colorFeeling',
          label: '色彩感觉',
        }),
        expect.objectContaining({ key: 'wearingFeel', label: '穿着感' }),
        expect.objectContaining({ key: 'length', label: '长度' }),
        expect.objectContaining({ key: 'fit', label: '版型' }),
      ]),
    });
    expect(controller.taxonomy().groups).toHaveLength(12);
    expect(
      controller.taxonomy().groups.find((group) => group.key === 'fit')?.tags,
    ).toContain('宽松');
  });

  it('returns garment list as miniapp JSON view models', async () => {
    const { controller, garmentService, req } = makeController();
    garmentService.findAll.mockResolvedValue([makeGarment()]);

    const listed = await controller.index(req);
    expect(listed).toEqual({
      items: [
        expect.objectContaining({
          id: 7,
          name: 'Black Coat',
          category: 'outerwear',
          categoryLabel: '外套',
          color: GarmentColor.BLACK,
          colorLabel: '黑色',
          season: 'winter',
          brand: 'Sample',
          size: 'M',
          photoUrl: 'https://aimatchwear.asia/file/coat.webp',
          detailUrl: '/api/miniapp/garments/7',
        }),
      ],
    });
    expect(listed.items[0]).not.toHaveProperty('status');
    expect(listed.items[0]).not.toHaveProperty('statusLabel');
    expect(garmentService.findAll).toHaveBeenCalledWith(undefined, {});
  });

  it('passes authenticated miniapp user id into wardrobe queries', async () => {
    const { controller, garmentService, req } = makeController();
    req.user = { userId: 42 };
    garmentService.findAll.mockResolvedValue([makeGarment()]);

    await controller.index(req);

    expect(garmentService.findAll).toHaveBeenCalledWith(42, {});
  });

  it('exports wardrobe backup as a zip buffer', async () => {
    const { controller, garmentService, fileService, req } = makeController();
    garmentService.findAll.mockResolvedValue([makeGarment()]);
    fileService.get.mockResolvedValue(
      Readable.from(Buffer.from('photo-bytes')),
    );
    const reply = {
      header: jest.fn().mockReturnThis(),
      send: jest.fn((payload) => payload),
    };

    const zip = await controller.exportBackup(req, reply as any);

    expect(reply.header).toHaveBeenCalledWith(
      'Content-Type',
      'application/zip',
    );
    expect(reply.header).toHaveBeenCalledWith(
      'Content-Disposition',
      expect.stringContaining('wardrobe-backup-'),
    );
    expect(Buffer.isBuffer(zip)).toBe(true);
    expect(zip.subarray(0, 2).toString()).toBe('PK');
    expect(zip.toString('utf8')).toContain('manifest.json');
    expect(zip.toString('utf8')).toContain('photos/7-coat.webp');
    expect(zip.toString('utf8')).not.toMatch(/"status"\s*:/);
  });

  it('imports wardrobe backup zip files', async () => {
    const { controller, garmentService, fileService, req } = makeController();
    garmentService.findAll.mockResolvedValue([makeGarment()]);
    garmentService.create.mockResolvedValue(makeGarment({ id: 18 }));
    fileService.get.mockResolvedValue(
      Readable.from(Buffer.from('photo-bytes')),
    );
    const reply = {
      header: jest.fn().mockReturnThis(),
      send: jest.fn((payload) => payload),
    };
    const zip = (await controller.exportBackup(req, reply as any)) as Buffer;
    req.file = jest.fn(() =>
      Promise.resolve({
        filename: 'wardrobe-backup.zip',
        mimetype: 'application/zip',
        file: Readable.from(zip),
      }),
    );

    await expect(controller.importBackup(req)).resolves.toEqual({
      imported: 1,
      skipped: 0,
    });
    expect(garmentService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Black Coat',
        category: 'outerwear',
        color: GarmentColor.BLACK,
        seasons: ['winter'],
        brand: 'Sample',
        size: 'M',
        notes: 'Warm',
        photo: expect.objectContaining({
          filename: '7-coat.webp',
          mimetype: 'image/webp',
        }),
      }),
      undefined,
    );
    expect(garmentService.create.mock.calls[0][0]).not.toHaveProperty('status');
  });

  it('creates a garment from miniapp multipart upload data', async () => {
    const { controller, garmentService, req } = makeController();
    const upload = { mimetype: 'image/jpeg' };
    req.file = jest.fn(() => Promise.resolve(upload));
    garmentService.create.mockResolvedValue(makeGarment({ id: 9 }));

    await expect(
      controller.create(
        {
          name: 'White Shirt',
          category: 'tops',
          color: GarmentColor.WHITE,
          season: 'spring',
          brand: 'Sample',
          size: 'S',
          notes: 'Office',
        },
        req,
      ),
    ).resolves.toEqual({
      item: expect.objectContaining({
        id: 9,
        photoUrl: 'https://aimatchwear.asia/file/coat.webp',
      }),
    });
    expect(garmentService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'White Shirt',
        category: 'tops',
        color: GarmentColor.WHITE,
        seasons: 'spring',
        brand: 'Sample',
        size: 'S',
        notes: 'Office',
        photo: upload,
      }),
      undefined,
    );
    expect(garmentService.update).not.toHaveBeenCalled();
  });

  it('saves authenticated miniapp garments under the current user id', async () => {
    const { controller, garmentService, req } = makeController();
    req.user = { userId: 42 };
    const upload = { mimetype: 'image/jpeg' };
    req.file = jest.fn(() => Promise.resolve(upload));
    garmentService.create.mockResolvedValue(makeGarment({ id: 9 }));

    await controller.create({ name: 'White Shirt', category: 'tops' }, req);

    expect(garmentService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'White Shirt',
        category: 'tops',
        photo: upload,
      }),
      42,
    );
  });

  it('returns an AI editable draft without saving a garment', async () => {
    const { controller, garmentService, garmentVisionService, req } =
      makeController();
    const upload = { mimetype: 'image/jpeg' };
    req.file = jest.fn(() => Promise.resolve(upload));
    garmentVisionService.analyzeImage.mockResolvedValue({
      fileName: 'coat.webp',
      category: 'bottoms',
      subcategory: '牛仔裤',
      color: GarmentColor.BLUE,
      seasons: ['夏'],
      styleTags: ['休闲'],
      sceneTags: ['日常'],
      material: '牛仔',
      thickness: '中等',
      confidence: 0.86,
      notes: '蓝色牛仔裤，适合日常场合。',
    });
    garmentVisionService.analyzeUpload.mockResolvedValue({
      fileName: 'miniapp-upload.webp',
      category: 'bottoms',
      subcategory: '牛仔裤',
      color: GarmentColor.BLUE,
      seasons: ['夏'],
      styleTags: ['休闲'],
      sceneTags: ['日常'],
      material: '牛仔',
      thickness: '中等',
      ...defaultStructuredFields,
      confidence: 0.86,
      notes: '蓝色牛仔裤，适合日常场合。',
    });

    await expect(controller.analyze(req)).resolves.toEqual({
      draft: expect.objectContaining({
        category: 'bottoms',
        color: GarmentColor.BLUE,
        seasons: ['夏'],
        styleTags: ['休闲'],
        sceneTags: ['日常'],
        material: '牛仔',
      }),
      duplicateCandidates: [],
    });
    expect(garmentVisionService.analyzeUpload).toHaveBeenCalledWith(upload);
    expect(garmentService.create).not.toHaveBeenCalled();
    expect(garmentService.update).not.toHaveBeenCalled();
  });

  it('returns possible duplicate garments with the AI editable draft', async () => {
    const { controller, garmentService, garmentVisionService, req } =
      makeController();
    req.user = { userId: 42 };
    const upload = { mimetype: 'image/jpeg' };
    req.file = jest.fn(() => Promise.resolve(upload));
    const draft = {
      fileName: 'miniapp-upload.webp',
      category: 'outerwear',
      subcategory: '西装外套',
      color: GarmentColor.BLACK,
      seasons: ['秋'],
      styleTags: ['通勤'],
      sceneTags: ['上班'],
      material: '羊毛',
      thickness: '中等',
      pocketPresence: 'no',
      pocketPosition: 'unknown',
      chestMarkPresence: 'yes',
      chestMarkType: 'text',
      chestMarkPosition: 'chest-left',
      chestMarkText: 'r',
      confidence: 0.88,
      notes: '黑色西装外套。',
    };
    garmentVisionService.analyzeUpload.mockResolvedValue(draft);
    garmentService.findSimilarToDraft.mockResolvedValue([
      {
        garment: makeGarment({
          id: 21,
          name: '黑色西装外套',
          category: 'outerwear',
          color: GarmentColor.BLACK,
          subcategory: '西装外套',
          photo: { fileName: 'black-blazer.webp' } as any,
        }),
        score: 90,
        reasons: ['分类相同', '颜色相同', '细分相同'],
      },
    ]);

    await expect(controller.analyze(req)).resolves.toEqual({
      draft,
      duplicateCandidates: [
        expect.objectContaining({
          id: 21,
          name: '黑色西装外套',
          categoryLabel: '外套',
          colorLabel: '黑色',
          matchScore: 90,
          matchReason: '分类相同、颜色相同、细分相同',
          photoUrl: 'https://aimatchwear.asia/file/black-blazer.webp',
        }),
      ],
    });
    expect(garmentService.findSimilarToDraft).toHaveBeenCalledWith(draft, 42);
  });

  it('saves user-confirmed AI draft fields from miniapp upload data', async () => {
    const { controller, garmentService, req } = makeController();
    const upload = { mimetype: 'image/jpeg' };
    req.file = jest.fn(() => Promise.resolve(upload));
    garmentService.create.mockResolvedValue(
      makeGarment({
        id: 12,
        category: 'bottoms',
        color: GarmentColor.BLUE,
        seasons: ['夏'],
        styleTags: ['休闲'],
        sceneTags: ['日常'],
        material: '牛仔',
        thickness: '中等',
        taxonomyTags: {
          color: ['蓝色'],
          colorFeeling: ['冷色'],
          occasion: ['日常'],
        },
        pocketPresence: 'no',
        pocketPosition: 'unknown',
        chestMarkPresence: 'yes',
        chestMarkType: 'text',
        chestMarkPosition: 'chest-left',
        chestMarkText: 'R',
      } as Partial<Garment>),
    );

    await expect(
      controller.create(
        {
          name: '牛仔裤',
          category: 'bottoms',
          color: GarmentColor.BLUE,
          season: '夏',
          subcategory: '牛仔裤',
          styleTags: '休闲',
          sceneTags: '日常',
          material: '牛仔',
          thickness: '中等',
          taxonomyTags: JSON.stringify({
            color: ['蓝色'],
            colorFeeling: ['冷色'],
            occasion: ['日常'],
          }),
          pocketPresence: 'no',
          pocketPosition: 'unknown',
          chestMarkPresence: 'yes',
          chestMarkType: 'text',
          chestMarkPosition: 'chest-left',
          chestMarkText: 'R',
          notes: '用户确认后的备注',
        },
        req,
      ),
    ).resolves.toEqual({
      item: expect.objectContaining({
        id: 12,
        category: 'bottoms',
        color: GarmentColor.BLUE,
        season: '夏',
        styleTags: ['休闲'],
        sceneTags: ['日常'],
        material: '牛仔',
        thickness: '中等',
        taxonomyTags: {
          color: ['蓝色'],
          colorFeeling: ['冷色'],
          occasion: ['日常'],
        },
        taxonomyTagList: ['蓝色', '冷色', '日常'],
        pocketPresence: 'no',
        pocketPosition: 'unknown',
        chestMarkPresence: 'yes',
        chestMarkType: 'text',
        chestMarkPosition: 'chest-left',
        chestMarkText: 'R',
      }),
    });
    expect(garmentService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: '牛仔裤',
        category: 'bottoms',
        color: GarmentColor.BLUE,
        seasons: '夏',
        subcategory: '牛仔裤',
        styleTags: '休闲',
        sceneTags: '日常',
        material: '牛仔',
        thickness: '中等',
        taxonomyTags: JSON.stringify({
          color: ['蓝色'],
          colorFeeling: ['冷色'],
          occasion: ['日常'],
        }),
        pocketPresence: 'no',
        pocketPosition: 'unknown',
        chestMarkPresence: 'yes',
        chestMarkType: 'text',
        chestMarkPosition: 'chest-left',
        chestMarkText: 'R',
        notes: '用户确认后的备注',
        photo: upload,
      }),
      undefined,
    );
    expect(garmentService.update).not.toHaveBeenCalled();
  });

  it('updates miniapp garment text fields without changing photo', async () => {
    const { controller, garmentService, req } = makeController();
    garmentService.update.mockResolvedValue(
      makeGarment({
        id: 7,
        name: '白色衬衫',
        category: 'tops',
        color: GarmentColor.WHITE,
        seasons: ['spring'],
        styleTags: ['通勤'],
        sceneTags: ['上班'],
        material: '棉',
        thickness: '薄款',
        notes: '编辑后的备注',
      } as Partial<Garment>),
    );

    await expect(
      controller.update(
        7,
        {
          name: '白色衬衫',
          category: 'tops',
          color: GarmentColor.WHITE,
          season: 'spring',
          styleTags: '通勤',
          sceneTags: '上班',
          material: '棉',
          thickness: '薄款',
          notes: '编辑后的备注',
        },
        req,
      ),
    ).resolves.toEqual({
      item: expect.objectContaining({
        id: 7,
        name: '白色衬衫',
        category: 'tops',
        color: GarmentColor.WHITE,
        season: 'spring',
        styleTags: ['通勤'],
        sceneTags: ['上班'],
        material: '棉',
        thickness: '薄款',
        photoUrl: 'https://aimatchwear.asia/file/coat.webp',
      }),
    });
    expect(garmentService.update).toHaveBeenCalledWith(
      7,
      expect.objectContaining({
        name: '白色衬衫',
        category: 'tops',
        color: GarmentColor.WHITE,
        seasons: 'spring',
        styleTags: '通勤',
        sceneTags: '上班',
        material: '棉',
        thickness: '薄款',
        notes: '编辑后的备注',
      }),
      undefined,
    );
  });

  it('reads miniapp form data from multipart file fields when body is empty', async () => {
    const { controller, garmentService, req } = makeController();
    const upload = {
      mimetype: 'image/jpeg',
      fields: {
        name: { value: '白T' },
        category: { value: 'T袖' },
        color: { value: '白色' },
        season: { value: '夏天' },
        brand: { value: '' },
        size: { value: 'M' },
        notes: { value: '' },
      },
    };
    req.file = jest.fn(() => Promise.resolve(upload));
    garmentService.create.mockResolvedValue(makeGarment({ id: 10 }));

    await expect(controller.create({}, req)).resolves.toEqual({
      item: expect.objectContaining({ id: 10 }),
    });
    expect(garmentService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: '白T',
        category: 'T袖',
        color: '白色',
        seasons: '夏天',
        brand: undefined,
        size: 'M',
        notes: undefined,
        photo: upload,
      }),
      undefined,
    );
  });

  it('reads miniapp form data when Fastify does not provide a body object', async () => {
    const { controller, garmentService, req } = makeController();
    const upload = {
      mimetype: 'image/jpeg',
      fields: {
        name: { value: 'Blue Pants' },
        category: { value: 'bottoms' },
        color: { value: GarmentColor.BLUE },
        season: { value: 'summer' },
      },
    };
    req.file = jest.fn(() => Promise.resolve(upload));
    garmentService.create.mockResolvedValue(makeGarment({ id: 11 }));

    await expect(controller.create(undefined as any, req)).resolves.toEqual({
      item: expect.objectContaining({ id: 11 }),
    });
    expect(garmentService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Blue Pants',
        category: 'bottoms',
        color: GarmentColor.BLUE,
        seasons: 'summer',
        photo: upload,
      }),
      undefined,
    );
  });

  it('rejects non-image uploads before creating a garment', async () => {
    const { controller, garmentService, req } = makeController();
    req.file = jest.fn(() => Promise.resolve({ mimetype: 'text/plain' }));

    await expect(
      controller.create({ name: 'Bad file', category: 'tops' }, req),
    ).rejects.toThrow('上传文件必须是图片');
    expect(garmentService.create).not.toHaveBeenCalled();
  });

  it('deletes garments through the service', async () => {
    const { controller, garmentService, req } = makeController();

    await expect(controller.remove(7, req)).resolves.toEqual({ ok: true });
    expect(garmentService.remove).toHaveBeenCalledWith(7, undefined);
  });
});
