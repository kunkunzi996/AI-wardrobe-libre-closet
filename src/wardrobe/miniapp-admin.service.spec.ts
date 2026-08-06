import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { GarmentColor } from './garment-color.enum';
import {
  buildGarmentTagBackfillPatch,
  GarmentService,
} from './garment.service';
import { MiniappAdminService } from './miniapp-admin.service';

describe('MiniappAdminService', () => {
  const validAnalysis = (overrides: Record<string, unknown> = {}) => ({
    fileName: 'shirt.webp',
    category: 'tops',
    seasons: ['summer'],
    styleTags: ['简约'],
    sceneTags: ['日常'],
    taxonomyTags: {
      season: ['夏季'],
      style: ['简约'],
      occasion: ['日常'],
    },
    pocketPresence: 'unknown',
    pocketPosition: 'unknown',
    chestMarkPresence: 'unknown',
    chestMarkType: 'unknown',
    chestMarkPosition: 'unknown',
    chestMarkText: null,
    confidence: 0.9,
    notes: 'test',
    ...overrides,
  });

  const makeGarment = (overrides: Record<string, unknown> = {}) => ({
    id: 1,
    name: '黑色短袖',
    category: 'tops',
    owner: { id: 12 },
    photo: { fileName: 'shirt.webp' },
    ...overrides,
  });

  const makeService = (
    options: {
      config?: Record<string, string>;
      garments?: any[];
      users?: any[];
      analyzeImage?: (fileName: string) => Promise<any>;
      backfill?: (id: number, userId: number, analysis: any) => Promise<any>;
    } = {},
  ) => {
    const config = options.config ?? {};
    const users = options.users ?? [
      { id: 7, nickname: '管理员', wechatOpenId: 'admin-openid' },
      { id: 12, nickname: '普通用户', wechatOpenId: 'normal-openid' },
    ];
    const garments = options.garments ?? [
      { id: 1, owner: { id: 12 } },
      { id: 2, owner: { id: 12 } },
    ];
    const userRepository = {
      findOne: jest.fn((id: number) =>
        Promise.resolve(users.find((user) => user.id === id)),
      ),
      find: jest.fn(() => Promise.resolve(users)),
    };
    const garmentRepository = {
      find: jest.fn(() => Promise.resolve(garments)),
    };
    const configService = {
      get: jest.fn((key: string) => config[key]),
    };
    const garmentVisionService = {
      analyzeImage: jest.fn(
        options.analyzeImage ?? (() => Promise.resolve(validAnalysis())),
      ),
    };
    const garmentService = {
      backfillTagsFromAi: jest.fn(
        options.backfill ??
          ((id: number) => {
            const garment = garments.find((item) => item.id === id);
            garment.tagsBackfilledAt = new Date();
            return Promise.resolve({
              changed: true,
              addedFieldCount: 3,
              mirrorConflictCount: 0,
            });
          }),
      ),
    };
    const service = new MiniappAdminService(
      userRepository as any,
      garmentRepository as any,
      garmentVisionService as any,
      garmentService as any,
      configService as any,
    );
    return {
      service,
      userRepository,
      garmentRepository,
      garmentVisionService,
      garmentService,
      garments,
    };
  };

  it('allows admin user ids from config', async () => {
    const { service } = makeService({
      config: { MINIAPP_ADMIN_USER_IDS: '7' },
    });

    await expect(service.isAdmin(7)).resolves.toBe(true);
    await expect(service.listUsers(7)).resolves.toEqual([
      expect.objectContaining({ id: 7, garmentCount: 0 }),
      expect.objectContaining({ id: 12, garmentCount: 2 }),
    ]);
  });

  it('allows admin wechat open ids from config', async () => {
    const { service } = makeService({
      config: { MINIAPP_ADMIN_WECHAT_OPEN_IDS: 'admin-openid' },
    });

    await expect(service.isAdmin(7)).resolves.toBe(true);
  });

  it('rejects non-admin users', async () => {
    const { service } = makeService({
      config: { MINIAPP_ADMIN_USER_IDS: '7' },
    });

    await expect(service.listUsers(12)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('checks admin access before looking up the target user', async () => {
    const { service, userRepository } = makeService({
      config: { MINIAPP_ADMIN_USER_IDS: '7' },
    });

    await expect(
      service.backfillUserGarmentTags(12, 999, 1),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(userRepository.findOne).not.toHaveBeenCalled();
  });

  it('rejects a missing target user', async () => {
    const { service } = makeService({
      config: { MINIAPP_ADMIN_USER_IDS: '7', QWEN_API_KEY: 'test-key' },
    });

    await expect(
      service.backfillUserGarmentTags(7, 999, 1),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('lists garments without photos without calling AI or writing a marker', async () => {
    const garment = makeGarment({ photo: undefined });
    const { service, garmentVisionService, garmentService } = makeService({
      config: { MINIAPP_ADMIN_USER_IDS: '7', QWEN_API_KEY: 'test-key' },
      garments: [garment],
    });

    const result = await service.backfillUserGarmentTags(7, 12, 1);

    expect(garmentVisionService.analyzeImage).not.toHaveBeenCalled();
    expect(garmentService.backfillTagsFromAi).not.toHaveBeenCalled();
    expect(garment.tagsBackfilledAt).toBeUndefined();
    expect(result).toMatchObject({
      noPhotoCount: 1,
      noPhotoItems: [{ id: 1, name: '黑色短袖' }],
      remainingUnattempted: 0,
      completionState: 'photo-complete-with-no-photo',
    });
  });

  it('does not mark the fallback result as analyzed', async () => {
    const garment = makeGarment();
    const { service, garmentService } = makeService({
      config: { MINIAPP_ADMIN_USER_IDS: '7', QWEN_API_KEY: 'test-key' },
      garments: [garment],
      analyzeImage: () =>
        Promise.resolve(
          validAnalysis({
            confidence: 0,
            taxonomyTags: {},
            seasons: [],
            styleTags: [],
            sceneTags: [],
          }),
        ),
    });

    const result = await service.backfillUserGarmentTags(7, 12, 1);

    expect(garmentService.backfillTagsFromAi).not.toHaveBeenCalled();
    expect(garment.tagsBackfilledAt).toBeUndefined();
    expect(result).toMatchObject({
      unreadableCount: 1,
      remainingUnattempted: 1,
      completionState: 'needs-retry',
      failedItems: [{ id: 1, name: '黑色短袖', reason: 'image-unreadable' }],
    });
  });

  it('keeps malformed AI tag structures retryable', async () => {
    const garment = makeGarment();
    const { service, garmentService } = makeService({
      config: { MINIAPP_ADMIN_USER_IDS: '7', QWEN_API_KEY: 'test-key' },
      garments: [garment],
      analyzeImage: () =>
        Promise.resolve(validAnalysis({ taxonomyTags: { season: '夏季' } })),
    });

    await expect(
      service.backfillUserGarmentTags(7, 12, 1),
    ).resolves.toMatchObject({
      unreadableCount: 1,
      remainingUnattempted: 1,
    });
    expect(garmentService.backfillTagsFromAi).not.toHaveBeenCalled();
    expect(garment.tagsBackfilledAt).toBeUndefined();
  });

  it('keeps malformed legacy tag arrays retryable', async () => {
    const garment = makeGarment();
    const { service, garmentService } = makeService({
      config: { MINIAPP_ADMIN_USER_IDS: '7', QWEN_API_KEY: 'test-key' },
      garments: [garment],
      analyzeImage: () =>
        Promise.resolve(validAnalysis({ styleTags: ['简约', 123] })),
    });

    await expect(
      service.backfillUserGarmentTags(7, 12, 1),
    ).resolves.toMatchObject({
      unreadableCount: 1,
      remainingUnattempted: 1,
    });
    expect(garmentService.backfillTagsFromAi).not.toHaveBeenCalled();
    expect(garment.tagsBackfilledAt).toBeUndefined();
  });

  it('marks a valid but unchanged analysis to prevent repeated calls', async () => {
    const garment = makeGarment();
    const { service, garmentService } = makeService({
      config: { MINIAPP_ADMIN_USER_IDS: '7', QWEN_API_KEY: 'test-key' },
      garments: [garment],
      backfill: () => {
        garment.tagsBackfilledAt = new Date();
        return Promise.resolve({
          changed: false,
          addedFieldCount: 0,
          mirrorConflictCount: 0,
        });
      },
    });

    const result = await service.backfillUserGarmentTags(7, 12, 1);

    expect(garmentService.backfillTagsFromAi).toHaveBeenCalledTimes(1);
    expect(garment.tagsBackfilledAt).toBeInstanceOf(Date);
    expect(result).toMatchObject({
      analyzedThisRun: 1,
      unchangedCount: 1,
      remainingUnattempted: 0,
    });
  });

  it('only appends safe tags and preserves the existing category and scalar values', () => {
    const garment = {
      category: 'tops',
      color: GarmentColor.BLACK,
      seasons: ['spring'],
      styleTags: ['通勤'],
      sceneTags: ['日常'],
      material: '棉',
      thickness: '薄款',
      fit: '合身',
      subcategory: 'T恤',
      taxonomyTags: {
        color: ['黑色'],
        season: ['春季'],
        style: ['通勤'],
        occasion: ['日常'],
        material: ['棉'],
        thickness: ['薄款'],
        fit: ['合身'],
        category: ['T恤'],
      },
    } as any;
    const { patch, outcome } = buildGarmentTagBackfillPatch(
      garment,
      validAnalysis({
        color: GarmentColor.WHITE,
        taxonomyTags: {
          color: ['白色'],
          season: ['夏季'],
          style: ['通勤', '简约'],
          occasion: ['日常', '旅行'],
          material: ['羊毛'],
          thickness: ['厚款'],
          fit: ['宽松'],
          category: ['衬衫'],
        },
      }) as any,
    );

    expect(garment.category).toBe('tops');
    expect(patch.color).toBeUndefined();
    expect(patch.material).toBeUndefined();
    expect(patch.thickness).toBeUndefined();
    expect(patch.fit).toBeUndefined();
    expect(patch.subcategory).toBeUndefined();
    expect(patch.styleTags).toEqual(['通勤', '简约']);
    expect(patch.sceneTags).toEqual(['日常', '旅行']);
    expect(patch.seasons).toEqual(['spring', 'summer']);
    expect(patch.taxonomyTags).toMatchObject({
      color: ['黑色', '白色'],
      season: ['春季', '夏季'],
      style: ['通勤', '简约'],
      occasion: ['日常', '旅行'],
      material: ['棉', '羊毛'],
      thickness: ['薄款', '厚款'],
      fit: ['合身', '宽松'],
      category: ['T恤', '衬衫'],
    });
    expect(outcome.changed).toBe(true);
  });

  it('fills empty legacy fields from taxonomy and empty taxonomy groups from legacy fields', () => {
    const fromTaxonomy = buildGarmentTagBackfillPatch(
      {
        category: 'tops',
        taxonomyTags: {
          season: ['夏季'],
          color: ['黑色'],
          style: ['简约'],
          occasion: ['日常'],
          material: ['棉'],
          thickness: ['薄款'],
          fit: ['合身'],
          category: ['T恤'],
        },
      } as any,
      validAnalysis({
        taxonomyTags: {},
        seasons: [],
        styleTags: [],
        sceneTags: [],
      }) as any,
    );
    expect(fromTaxonomy.patch).toMatchObject({
      seasons: ['summer'],
      color: GarmentColor.BLACK,
      styleTags: ['简约'],
      sceneTags: ['日常'],
      material: '棉',
      thickness: '薄款',
      fit: '合身',
      subcategory: 'T恤',
    });

    const fromLegacy = buildGarmentTagBackfillPatch(
      {
        category: 'tops',
        color: GarmentColor.BLACK,
        seasons: ['spring'],
        styleTags: ['简约'],
        sceneTags: ['日常'],
        material: '棉',
        thickness: '薄款',
        fit: '合身',
        subcategory: 'T恤',
        taxonomyTags: { unexpectedLegacyGroup: ['保留'] },
      } as any,
      validAnalysis({
        taxonomyTags: {},
        seasons: [],
        styleTags: [],
        sceneTags: [],
      }) as any,
    );
    expect(fromLegacy.patch.taxonomyTags).toMatchObject({
      unexpectedLegacyGroup: ['保留'],
      season: ['春季'],
      color: ['黑色'],
      style: ['简约'],
      occasion: ['日常'],
      material: ['棉'],
      thickness: ['薄款'],
      fit: ['合身'],
      category: ['T恤'],
    });
  });

  it('reports mirror conflicts without overwriting either side', () => {
    const garment = {
      category: 'tops',
      color: GarmentColor.BLACK,
      taxonomyTags: { color: ['白色'], category: ['衬衫'] },
      subcategory: 'T恤',
    } as any;
    const { patch, outcome } = buildGarmentTagBackfillPatch(
      garment,
      validAnalysis({
        taxonomyTags: {},
        seasons: [],
        styleTags: [],
        sceneTags: [],
      }) as any,
    );

    expect(outcome.mirrorConflictCount).toBe(2);
    expect(patch.color).toBeUndefined();
    expect(patch.subcategory).toBeUndefined();
    expect(garment.category).toBe('tops');
  });

  it('applies the tag patch and processed marker in one garment transaction', async () => {
    const garment = makeGarment({
      taxonomyTags: {},
      seasons: [],
      styleTags: [],
      sceneTags: [],
    });
    const transactionalEntityManager = {
      findOne: jest.fn(() => Promise.resolve(garment)),
      flush: jest.fn(() => Promise.resolve()),
    };
    const forkedEntityManager = {
      transactional: jest.fn((callback) =>
        callback(transactionalEntityManager),
      ),
    };
    const garmentRepository = {
      getEntityManager: jest.fn(() => ({
        fork: jest.fn(() => forkedEntityManager),
      })),
    };
    const garmentService = new GarmentService(
      garmentRepository as any,
      {} as any,
      {} as any,
      {} as any,
    );

    const outcome = await garmentService.backfillTagsFromAi(
      1,
      12,
      validAnalysis() as any,
    );

    expect(transactionalEntityManager.findOne).toHaveBeenCalledWith(
      expect.anything(),
      { id: 1, owner: { id: 12 } },
    );
    expect(transactionalEntityManager.flush).toHaveBeenCalledTimes(1);
    expect(garment.tagsBackfilledAt).toBeInstanceOf(Date);
    expect(garment.taxonomyTags).toMatchObject({
      season: ['夏季'],
      style: ['简约'],
      occasion: ['日常'],
    });
    expect(outcome).toMatchObject({ changed: true, addedFieldCount: 6 });
  });

  it('honors requested limits and reduces the batch when the configured timeout requires it', async () => {
    for (const requestedLimit of [1, 2, 3]) {
      const { service } = makeService({
        config: { MINIAPP_ADMIN_USER_IDS: '7', QWEN_API_KEY: 'test-key' },
        garments: [makeGarment({ id: requestedLimit })],
      });
      await expect(
        service.backfillUserGarmentTags(7, 12, requestedLimit),
      ).resolves.toMatchObject({
        requestedLimit,
        effectiveLimit: requestedLimit,
      });
    }

    const { service } = makeService({
      config: {
        MINIAPP_ADMIN_USER_IDS: '7',
        QWEN_API_KEY: 'test-key',
        AI_VISION_TIMEOUT_MS: '40000',
      },
      garments: [makeGarment({ id: 1 }), makeGarment({ id: 2 })],
    });
    await expect(
      service.backfillUserGarmentTags(7, 12, 3),
    ).resolves.toMatchObject({
      effectiveLimit: 2,
    });
  });

  it('runs a full batch at the production vision timeout', async () => {
    const { service } = makeService({
      config: {
        MINIAPP_ADMIN_USER_IDS: '7',
        QWEN_API_KEY: 'test-key',
        AI_VISION_TIMEOUT_MS: '30000',
      },
      garments: [
        makeGarment({ id: 1 }),
        makeGarment({ id: 2 }),
        makeGarment({ id: 3 }),
      ],
    });
    await expect(
      service.backfillUserGarmentTags(7, 12, 3),
    ).resolves.toMatchObject({
      requestedLimit: 3,
      effectiveLimit: 3,
    });
  });

  it('fails before the loop when AI configuration cannot safely run a batch', async () => {
    const noKey = makeService({
      config: { MINIAPP_ADMIN_USER_IDS: '7' },
      garments: [makeGarment()],
    });
    await expect(
      noKey.service.backfillUserGarmentTags(7, 12, 1),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(noKey.garmentVisionService.analyzeImage).not.toHaveBeenCalled();

    const tooSlow = makeService({
      config: {
        MINIAPP_ADMIN_USER_IDS: '7',
        QWEN_API_KEY: 'test-key',
        AI_VISION_TIMEOUT_MS: '100000',
      },
      garments: [makeGarment()],
    });
    await expect(
      tooSlow.service.backfillUserGarmentTags(7, 12, 1),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(tooSlow.garmentVisionService.analyzeImage).not.toHaveBeenCalled();
  });

  it('prevents concurrent runs for the same user but permits different users', async () => {
    let releaseFirstRun: (value: unknown) => void = () => undefined;
    const firstAnalysis = new Promise((resolve) => {
      releaseFirstRun = resolve;
    });
    const sameUser = makeService({
      config: { MINIAPP_ADMIN_USER_IDS: '7', QWEN_API_KEY: 'test-key' },
      garments: [makeGarment()],
      analyzeImage: () => firstAnalysis,
    });
    const firstRun = sameUser.service.backfillUserGarmentTags(7, 12, 1);
    await Promise.resolve();
    await Promise.resolve();
    await expect(
      sameUser.service.backfillUserGarmentTags(7, 12, 1),
    ).rejects.toBeInstanceOf(ConflictException);
    releaseFirstRun(validAnalysis());
    await firstRun;

    const differentUsers = makeService({
      config: { MINIAPP_ADMIN_USER_IDS: '7', QWEN_API_KEY: 'test-key' },
      users: [
        { id: 7, nickname: '管理员', wechatOpenId: 'admin-openid' },
        { id: 12, nickname: '用户一', wechatOpenId: 'one' },
        { id: 13, nickname: '用户二', wechatOpenId: 'two' },
      ],
      garments: [
        makeGarment({ id: 1, owner: { id: 12 } }),
        makeGarment({ id: 2, owner: { id: 13 } }),
      ],
    });
    await expect(
      Promise.all([
        differentUsers.service.backfillUserGarmentTags(7, 12, 1),
        differentUsers.service.backfillUserGarmentTags(7, 13, 1),
      ]),
    ).resolves.toHaveLength(2);
  });

  it('stops before starting another image at the batch deadline', async () => {
    const now = jest.spyOn(Date, 'now');
    now.mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValue(75_001);
    const { service, garmentVisionService } = makeService({
      config: { MINIAPP_ADMIN_USER_IDS: '7', QWEN_API_KEY: 'test-key' },
      garments: [makeGarment({ id: 1 }), makeGarment({ id: 2 })],
    });

    await expect(
      service.backfillUserGarmentTags(7, 12, 3),
    ).resolves.toMatchObject({
      attemptedThisRun: 1,
      deadlineReached: true,
    });
    expect(garmentVisionService.analyzeImage).toHaveBeenCalledTimes(1);
    now.mockRestore();
  });

  it('keeps failed garments retryable and does not let a later flush save them', async () => {
    const first = makeGarment({ id: 1 });
    const second = makeGarment({ id: 2 });
    const { service } = makeService({
      config: { MINIAPP_ADMIN_USER_IDS: '7', QWEN_API_KEY: 'test-key' },
      garments: [first, second],
      backfill: (id: number) => {
        if (id === 1) return Promise.reject(new Error('flush failed'));
        second.tagsBackfilledAt = new Date();
        return Promise.resolve({
          changed: true,
          addedFieldCount: 2,
          mirrorConflictCount: 0,
        });
      },
    });

    const result = await service.backfillUserGarmentTags(7, 12, 2);

    expect(first.tagsBackfilledAt).toBeUndefined();
    expect(second.tagsBackfilledAt).toBeInstanceOf(Date);
    expect(result).toMatchObject({
      failedCount: 1,
      analyzedThisRun: 1,
      remainingUnattempted: 1,
      failedItems: [{ id: 1, name: '黑色短袖', reason: 'database-error' }],
    });
  });
});
