import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { WardrobeCopyService } from './wardrobe-copy.service';
import { MikroORM } from '@mikro-orm/core';
import { BetterSqliteDriver } from '@mikro-orm/better-sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { buffer } from 'node:stream/consumers';
import { File } from '../dal/entity/file.entity';
import { Garment } from '../dal/entity/garment.entity';
import { User } from '../dal/entity/user.entity';
import { Outfit } from '../dal/entity/outfit.entity';
import { OutfitCalendar } from '../dal/entity/outfit-calendar.entity';
import { OutfitFeedback } from '../dal/entity/outfit-feedback.entity';
import { GarmentImageNormalization } from '../dal/entity/garment-image-normalization.entity';
import { GarmentService } from './garment.service';
import { GarmentImageNormalizationService } from './garment-image-normalization.service';

const COUNTS = {
  sourceGarmentCount: 1,
  sourcePhotoCount: 1,
  sourceOutfitCount: 1,
  sourceCalendarCount: 1,
  sourceFeedbackCount: 1,
};

function spliceOwned(
  items: Array<{ id: number; owner?: { id?: number } }>,
  id: number,
  userId?: number,
) {
  const index = items.findIndex(
    (item) => item.id === id && item.owner?.id === userId,
  );
  if (index >= 0) items.splice(index, 1);
}

function spliceAllOwned(
  items: Array<{ owner?: { id?: number } }>,
  userId?: number,
) {
  for (let index = items.length - 1; index >= 0; index -= 1) {
    if (items[index].owner?.id === userId) items.splice(index, 1);
  }
}

function makeService(
  CopyService: new (...args: any[]) => any,
  extras: {
    targetGarments?: any[];
    targetOutfits?: any[];
    targetCalendars?: any[];
    targetFeedback?: any[];
  } = {},
) {
  const sourceGarment = {
    id: 10,
    name: '白T',
    category: 'tops',
    taxonomyTags: { color: ['白色'] },
    photo: { fileName: 'src.webp' },
    owner: { id: 1 },
  };
  const sourceOutfit = {
    id: 20,
    name: '日常',
    slots: [{ category: 'tops', garmentId: 10 }],
    photo: { fileName: 'look.webp' },
    owner: { id: 1 },
  };
  const sourceCalendar = {
    id: 30,
    date: new Date('2026-08-01T00:00:00.000Z'),
    outfit: { id: 20 },
    rating: 5,
    owner: { id: 1 },
  };
  const sourceFeedback = {
    id: 40,
    rating: 'good',
    garmentIds: [10],
    coreGarmentId: 10,
    owner: { id: 1 },
  };
  const users = [
    { id: 1, nickname: '老婆', acceptanceSandbox: false },
    { id: 2, nickname: '路人', acceptanceSandbox: false },
    { id: 3, nickname: '沙盒', acceptanceSandbox: true },
  ];
  const garments = [sourceGarment, ...(extras.targetGarments ?? [])];
  const outfits = [sourceOutfit, ...(extras.targetOutfits ?? [])];
  const calendars = [sourceCalendar, ...(extras.targetCalendars ?? [])];
  const feedback = [sourceFeedback, ...(extras.targetFeedback ?? [])];

  const owned = (items: Array<{ owner?: { id?: number } }>, userId?: number) =>
    items.filter((item) => item.owner?.id === userId);

  let nextId = 1000;
  const createdGarments: any[] = [];
  const createdOutfits: any[] = [];
  const createdCalendars: any[] = [];
  const createdFeedback: any[] = [];

  const adminService = {
    isAdmin: jest.fn((userId?: number) => Promise.resolve(userId === 7)),
  };
  const fileService = {
    copyStoredFile: jest.fn((fileName: string, userId: number) =>
      Promise.resolve({
        fileName: `copy-${fileName}`,
        createdBy: userId,
      }),
    ),
    storeImageFromFileUpload: jest.fn(),
  };
  const garmentService = {
    findAll: jest.fn((userId?: number) =>
      Promise.resolve(owned(garments, userId)),
    ),
    create: jest.fn((dto: any, userId?: number) => {
      const created = {
        id: nextId++,
        owner: { id: userId },
        name: dto.name,
        category: dto.category,
        taxonomyTags: dto.taxonomyTags,
        photo: dto.photoFileName ? { fileName: dto.photoFileName } : undefined,
      };
      createdGarments.push(created);
      garments.push(created);
      return Promise.resolve(created);
    }),
    remove: jest.fn((id: number, userId?: number) => {
      spliceOwned(garments, id, userId);
      return Promise.resolve();
    }),
  };
  const outfitService = {
    create: jest.fn((dto: any, userId?: number) => {
      const created = {
        id: nextId++,
        owner: { id: userId },
        name: dto.name,
        slots: dto.slots,
      };
      createdOutfits.push(created);
      outfits.push(created);
      return Promise.resolve(created);
    }),
    remove: jest.fn((id: number, userId?: number) => {
      spliceOwned(outfits, id, userId);
      return Promise.resolve();
    }),
  };
  const calendarService = {
    create: jest.fn((dto: any, userId?: number) => {
      const created = {
        id: nextId++,
        owner: { id: userId },
        date: dto.date,
        outfitId: dto.outfitId,
      };
      createdCalendars.push(created);
      calendars.push(created);
      return Promise.resolve(created);
    }),
    remove: jest.fn((id: number, userId?: number) => {
      spliceOwned(calendars, id, userId);
      return Promise.resolve();
    }),
  };
  const feedbackService = {
    create: jest.fn((dto: any, userId?: number) => {
      const created = {
        id: nextId++,
        owner: { id: userId },
        rating: dto.rating,
        garmentIds: dto.garmentIds,
        coreGarmentId: dto.coreGarmentId,
      };
      createdFeedback.push(created);
      feedback.push(created);
      return Promise.resolve(created);
    }),
    remove: jest.fn((id: number, userId?: number) => {
      spliceOwned(feedback, id, userId);
      return Promise.resolve();
    }),
  };
  const userRepository = {
    findOne: jest.fn((id: number) =>
      Promise.resolve(users.find((user) => user.id === id)),
    ),
  };
  const garmentRepository = {
    find: jest.fn((where: { owner?: { id?: number } }) =>
      Promise.resolve(owned(garments, where?.owner?.id)),
    ),
    nativeDelete: jest.fn((where: { owner?: { id?: number } }) => {
      spliceAllOwned(garments, where?.owner?.id);
      return Promise.resolve();
    }),
  };
  const outfitRepository = {
    find: jest.fn((where: { owner?: { id?: number } }) =>
      Promise.resolve(owned(outfits, where?.owner?.id)),
    ),
    nativeDelete: jest.fn((where: { owner?: { id?: number } }) => {
      spliceAllOwned(outfits, where?.owner?.id);
      return Promise.resolve();
    }),
  };
  const calendarRepository = {
    find: jest.fn((where: { owner?: { id?: number } }) =>
      Promise.resolve(owned(calendars, where?.owner?.id)),
    ),
    nativeDelete: jest.fn((where: { owner?: { id?: number } }) => {
      spliceAllOwned(calendars, where?.owner?.id);
      return Promise.resolve();
    }),
  };
  const feedbackRepository = {
    find: jest.fn((where: { owner?: { id?: number } }) =>
      Promise.resolve(owned(feedback, where?.owner?.id)),
    ),
    nativeDelete: jest.fn((where: { owner?: { id?: number } }) => {
      spliceAllOwned(feedback, where?.owner?.id);
      return Promise.resolve();
    }),
  };

  const service = new CopyService(
    adminService,
    garmentService,
    outfitService,
    calendarService,
    feedbackService,
    fileService,
    userRepository,
    garmentRepository,
    outfitRepository,
    calendarRepository,
    feedbackRepository,
  );

  return {
    service,
    fileService,
    garmentService,
    outfitService,
    calendarService,
    feedbackService,
    sourceGarment,
    sourceOutfit,
    createdGarments,
    createdOutfits,
    createdCalendars,
    createdFeedback,
    garments,
    outfits,
  };
}

describe('TEST-023 真实沙盒图片与状态复制', () => {
  let orm: MikroORM,
    garments: GarmentService,
    tasks: GarmentImageNormalizationService;
  let service: WardrobeCopyService, source: Garment, owner: User, target: User;
  let original: File, input: File, candidate: File, files: any;
  const bytes = new Map<string, Buffer>();
  const images = {
    isConfigured: () => true,
    promptVersion: '20261006-v1',
    model: 'qwen-image-3.0-pro',
    generate: jest.fn(),
  };
  const transferPath = path.join(__dirname, 'garment-image-transfer.service');
  const Transfer = fs.existsSync(transferPath + '.ts')
    ? require(transferPath).GarmentImageTransferService
    : undefined;
  beforeAll(async () => {
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
      password: 'copy-test-password-11111111',
      nickname: '源主人',
    });
    target = orm.em.create(User, {
      password: 'copy-test-password-22222222',
      nickname: '目标沙盒',
      acceptanceSandbox: true,
    });
    await orm.em.persistAndFlush([owner, target]);
    let next = 0;
    files = {
      get: jest.fn(async (name: string) => {
        if (!bytes.has(name)) throw new Error('缺图片');
        return Readable.from(bytes.get(name)!);
      }),
      storePrivateImageBuffer: jest.fn(async (data: Buffer, userId: number) => {
        const file = orm.em.create(File, {
          fileName: `private-copy-${++next}.png`,
          mimetype: 'image/png',
          createdBy: userId,
          createdOn: new Date().toISOString(),
        });
        await orm.em.persistAndFlush(file);
        bytes.set(file.fileName, Buffer.from(data));
        return file;
      }),
      copyStoredFile: jest.fn(async (name: string, userId: number) =>
        files.storePrivateImageBuffer(
          await buffer(await files.get(name)),
          userId,
        ),
      ),
      storeImageFromFileUpload: jest.fn(),
    };
    garments = new GarmentService(
      orm.em.getRepository(Garment) as any,
      orm.em.getRepository(File) as any,
      orm.em.getRepository(User) as any,
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
    service = new (WardrobeCopyService as any)(
      { isAdmin: async (id: number) => id === 7 },
      garments,
      {},
      {},
      {},
      files,
      orm.em.getRepository(User),
      orm.em.getRepository(Garment),
      orm.em.getRepository(Outfit),
      orm.em.getRepository(OutfitCalendar),
      orm.em.getRepository(OutfitFeedback),
      transfer,
    );
    original = await files.storePrivateImageBuffer(
      Buffer.from('复制原始字节'),
      owner.id,
    );
    input = await files.storePrivateImageBuffer(
      Buffer.from('复制固定输入字节'),
      owner.id,
    );
    candidate = await files.storePrivateImageBuffer(
      Buffer.from('复制候选字节'),
      owner.id,
    );
    source = orm.em.create(Garment, {
      category: 'tops',
      name: '源资料',
      brand: '源品牌',
      photo: input,
      originalPhoto: original,
      owner: owner.id,
      taxonomyTags: { category: ['衬衫'] },
    });
    await orm.em.persistAndFlush(source);
  });
  const copy = () =>
    service.copy(7, {
      sourceUserId: owner.id,
      targetUserId: target.id,
      sourceGarmentCount: 1,
      sourcePhotoCount: 1,
      sourceOutfitCount: 0,
      sourceCalendarCount: 0,
      sourceFeedbackCount: 0,
    });

  it('TEST-023 已采用候选及独立 sourcePhoto 由目标拥有，源只读，目标公开读图受主人保护', async () => {
    await tasks.start(source.id, owner.id, 'lzztesttime_copy');
    const work = (await tasks.claimQueued())!;
    await tasks.saveProviderResult(work, {
      requestId: 'must-not-copy',
      imageUrl: 'https://provider.invalid/secret.png',
      usage: {},
    });
    await tasks.completeCandidate(work, candidate.id);
    await tasks.adopt(source.id, owner.id, work.attemptKey);
    orm.em.clear();
    const before = await garments.findOne(source.id, owner.id);
    const beforeFields = {
      photo: before.photo!.id,
      original: before.originalPhoto!.id,
      name: before.name,
      brand: before.brand,
      owner: before.owner!.id,
    };
    const sourceRecord = await orm.em
      .fork()
      .findOneOrFail(GarmentImageNormalization, { garment: source.id });
    const result = await copy();
    expect(result.complete).toBe(true);
    orm.em.clear();
    const created = (await garments.findAll(target.id, {}))[0];
    expect(created.originalPhoto).toBeTruthy();
    expect(created.originalPhoto!.createdBy!.id).toBe(target.id);
    expect(created.photo!.id).not.toBe(candidate.id);
    expect(created.photo!.createdBy!.id).toBe(target.id);
    const record = await orm.em
      .fork()
      .findOneOrFail(
        GarmentImageNormalization,
        { garment: created.id },
        { populate: ['sourcePhoto', 'candidatePhoto'] },
      );
    expect(record.sourcePhoto.id).not.toBe(input.id);
    expect(record.candidatePhoto!.id).toBe(created.photo!.id);
    expect(record.resultUrl).toBeFalsy();
    expect(record.providerRequestId).toBeFalsy();
    expect((await tasks.get(created.id, target.id)).adopted).toBe(true);
    expect(
      await buffer(
        (
          await garments.readOwnedPhoto(
            created.id,
            target.id,
            'original',
            String(created.originalPhoto!.id),
          )
        ).stream,
      ),
    ).toEqual(Buffer.from('复制原始字节'));
    expect(
      await buffer(
        (
          await garments.readOwnedPhoto(
            created.id,
            target.id,
            'display',
            String(created.photo!.id),
          )
        ).stream,
      ),
    ).toEqual(Buffer.from('复制候选字节'));
    expect(
      await buffer(await files.get(record.sourcePhoto.getEntity().fileName)),
    ).toEqual(Buffer.from('复制固定输入字节'));
    await expect(
      garments.readOwnedPhoto(
        created.id,
        owner.id,
        'original',
        String(created.originalPhoto!.id),
      ),
    ).rejects.toThrow();
    expect(
      files.copyStoredFile.mock.calls.filter(
        ([name]: [string]) => name === candidate.fileName,
      ),
    ).toHaveLength(1);
    expect(
      files.copyStoredFile.mock.calls.filter(
        ([name]: [string]) => name === input.fileName,
      ),
    ).toHaveLength(1);
    const after = await garments.findOne(source.id, owner.id);
    expect({
      photo: after.photo!.id,
      original: after.originalPhoto!.id,
      name: after.name,
      brand: after.brand,
      owner: after.owner!.id,
    }).toEqual(beforeFields);
    const afterRecord = await orm.em
      .fork()
      .findOneOrFail(GarmentImageNormalization, { garment: source.id });
    expect(afterRecord.attemptKey).toBe(sourceRecord.attemptKey);
    expect(afterRecord.resultUrl).toBe(sourceRecord.resultUrl);
    expect(afterRecord.status).toBe('ready');
    expect(files.storeImageFromFileUpload).not.toHaveBeenCalled();
    expect(images.generate).not.toHaveBeenCalled();
  });

  it('TEST-023 processing 目标只恢复未知，源仍 processing，不能恢复收费派发', async () => {
    await tasks.start(source.id, owner.id, 'lzztesttime_copy');
    await tasks.claimQueued();
    await copy();
    orm.em.clear();
    const created = (await garments.findAll(target.id, {}))[0];
    expect(await tasks.get(created.id, target.id)).toMatchObject({
      status: 'uncertain',
      canStart: false,
    });
    expect(
      (
        await orm.em
          .fork()
          .findOneOrFail(GarmentImageNormalization, { garment: source.id })
      ).status,
    ).toBe('processing');
    expect(await tasks.claimQueued()).toBeNull();
    expect(images.generate).not.toHaveBeenCalled();
  });

  it('TEST-023 无原图源保持 null、不伪造，未标沙盒仍拒绝且零图片复制', async () => {
    source.originalPhoto = undefined;
    await orm.em.flush();
    target.acceptanceSandbox = false;
    await orm.em.flush();
    await expect(copy()).rejects.toThrow(/沙盒/);
    expect(files.copyStoredFile).not.toHaveBeenCalled();
    target.acceptanceSandbox = true;
    await orm.em.flush();
    await copy();
    const created = (await garments.findAll(target.id, {}))[0];
    expect(created.originalPhoto ?? null).toBeNull();
    expect(images.generate).not.toHaveBeenCalled();
  });
});

describe('wardrobe copy', () => {
  it('copies a full wardrobe onto an empty sandbox and leaves the source unchanged', async () => {
    const ctx = makeService(WardrobeCopyService);

    const preview = await ctx.service.preview(7, 1, 3);
    expect(preview).toMatchObject({
      source: {
        id: 1,
        displayName: '老婆',
        garmentCount: 1,
        photoCount: 1,
        outfitCount: 1,
        calendarCount: 1,
        feedbackCount: 1,
      },
      target: {
        id: 3,
        displayName: '沙盒',
        acceptanceSandbox: true,
        garmentCount: 0,
      },
    });

    const result = await ctx.service.copy(7, {
      sourceUserId: 1,
      targetUserId: 3,
      ...COUNTS,
    });
    expect(result).toMatchObject({
      complete: true,
      copied: {
        garments: 1,
        photos: 1,
        outfits: 1,
        calendars: 1,
        feedback: 1,
      },
      matched: {
        outfitSlots: 1,
        outfitSlotsMapped: 1,
        calendars: 1,
        calendarsMapped: 1,
        feedbackGarmentIds: 2,
        feedbackGarmentIdsMapped: 2,
      },
    });

    expect(ctx.fileService.copyStoredFile).toHaveBeenCalledWith('src.webp', 3);
    expect(ctx.fileService.copyStoredFile).toHaveBeenCalledWith('look.webp', 3);
    expect(ctx.fileService.storeImageFromFileUpload).not.toHaveBeenCalled();
    expect(ctx.sourceGarment).toEqual({
      id: 10,
      name: '白T',
      category: 'tops',
      taxonomyTags: { color: ['白色'] },
      photo: { fileName: 'src.webp' },
      owner: { id: 1 },
    });
    expect(ctx.sourceOutfit.slots[0].garmentId).toBe(10);

    const copiedGarment = ctx.createdGarments[0];
    expect(copiedGarment.id).not.toBe(10);
    expect(copiedGarment.owner.id).toBe(3);
    expect(copiedGarment.taxonomyTags).toEqual({ color: ['白色'] });
    expect(copiedGarment.photo.fileName).toBe('copy-src.webp');
    expect(ctx.garmentService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: '白T',
        category: 'tops',
        taxonomyTags: { color: ['白色'] },
        photoFileName: 'copy-src.webp',
      }),
      3,
    );

    const copiedOutfit = ctx.createdOutfits[0];
    expect(copiedOutfit.slots[0].garmentId).toBe(copiedGarment.id);
    expect(ctx.outfitService.create).toHaveBeenCalledWith(
      expect.objectContaining({ photoFileName: 'copy-look.webp' }),
      3,
    );
    expect(ctx.createdCalendars[0].outfitId).toBe(copiedOutfit.id);
    expect(ctx.createdFeedback[0]).toMatchObject({
      garmentIds: [copiedGarment.id],
      coreGarmentId: copiedGarment.id,
    });
  });

  it('rejects an unmarked target, the same source and target, and mismatched counts', async () => {
    const { service } = makeService(WardrobeCopyService);

    await expect(
      service.copy(7, {
        sourceUserId: 1,
        targetUserId: 2,
        ...COUNTS,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.copy(7, {
        sourceUserId: 3,
        targetUserId: 3,
        ...COUNTS,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.copy(7, {
        sourceUserId: 1,
        targetUserId: 3,
        ...COUNTS,
        sourceGarmentCount: 99,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.preview(12, 1, 3)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('rejects a wardrobe copy when garment ids cannot be remapped onto the sandbox', async () => {
    const broken = makeService(WardrobeCopyService);
    broken.sourceOutfit.slots[0].garmentId = 999;
    await expect(
      broken.service.copy(7, {
        sourceUserId: 1,
        targetUserId: 3,
        ...COUNTS,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(broken.garmentService.create).toHaveBeenCalled();
    expect(broken.outfitService.create).not.toHaveBeenCalled();
  });
});

describe('overwrite sandbox', () => {
  const staleTarget = {
    garments: [
      {
        id: 99,
        name: '旧副本',
        category: 'bottoms',
        owner: { id: 3 },
      },
    ],
    outfits: [{ id: 88, name: '旧搭配', slots: [], owner: { id: 3 } }],
    calendars: [
      {
        id: 77,
        date: new Date('2026-07-01T00:00:00.000Z'),
        outfit: { id: 88 },
        owner: { id: 3 },
      },
    ],
    feedback: [{ id: 66, rating: 'soso', garmentIds: [99], owner: { id: 3 } }],
  };

  it('rejects replacing existing data without confirm', async () => {
    const ctx = makeService(WardrobeCopyService, {
      targetGarments: staleTarget.garments,
      targetOutfits: staleTarget.outfits,
      targetCalendars: staleTarget.calendars,
      targetFeedback: staleTarget.feedback,
    });

    await expect(
      ctx.service.copy(7, {
        sourceUserId: 1,
        targetUserId: 3,
        ...COUNTS,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(ctx.garmentService.create).not.toHaveBeenCalled();
    expect(ctx.garments.map((item) => item.id)).toContain(99);
    expect(ctx.outfits.map((item) => item.id)).toContain(88);
  });

  it('replaces existing sandbox data after confirm', async () => {
    const ctx = makeService(WardrobeCopyService, {
      targetGarments: staleTarget.garments,
      targetOutfits: staleTarget.outfits,
      targetCalendars: staleTarget.calendars,
      targetFeedback: staleTarget.feedback,
    });

    const result = await ctx.service.copy(7, {
      sourceUserId: 1,
      targetUserId: 3,
      ...COUNTS,
      overwrite: true,
    });
    expect(result).toMatchObject({
      complete: true,
      copied: {
        garments: 1,
        photos: 1,
        outfits: 1,
        calendars: 1,
        feedback: 1,
      },
    });

    const targetGarmentIds = ctx.garments
      .filter((item) => item.owner?.id === 3)
      .map((item) => item.id);
    expect(targetGarmentIds).not.toContain(99);
    expect(targetGarmentIds).toHaveLength(1);
    expect(
      ctx.outfits.filter((item) => item.owner?.id === 3).map((item) => item.id),
    ).not.toContain(88);
    expect(ctx.sourceGarment.id).toBe(10);
    expect(ctx.sourceOutfit.slots[0].garmentId).toBe(10);
    expect(ctx.createdOutfits[0].slots[0].garmentId).toBe(targetGarmentIds[0]);
  });
});
