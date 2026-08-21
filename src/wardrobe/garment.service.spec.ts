import { Garment } from '../dal/entity/garment.entity';
import { GarmentService } from './garment.service';
import { GarmentColor } from './garment-color.enum';
import { GarmentStatus } from './garment-status.enum';

describe('GarmentService', () => {
  const makeService = (existingGarment?: Garment) => {
    const entityManager = {
      persistAndFlush: jest.fn(),
      flush: jest.fn(),
    };
    const garmentRepository = {
      create: jest.fn((data: Partial<Garment>) =>
        Object.assign(new Garment(), data),
      ),
      find: jest.fn(() => Promise.resolve([])),
      findOne: jest.fn(() => Promise.resolve(existingGarment ?? null)),
      getEntityManager: jest.fn(() => entityManager),
    };

    const service = new GarmentService(
      garmentRepository as any,
      { findOne: jest.fn(() => Promise.resolve(null)) } as any,
      {} as any,
      {} as any,
    );

    return { service, garmentRepository, entityManager };
  };

  it('creates garments with wardrobe metadata and normalized tag arrays', async () => {
    const { service, garmentRepository } = makeService();

    const garment = await service.create({
      name: '黑色西装外套',
      category: 'outerwear',
      subcategory: '西装',
      brand: 'Sample',
      color: GarmentColor.BLACK,
      size: 'm',
      seasons: '春, 秋，冬',
      styleTags: ['通勤', '法式'],
      sceneTags: '上班, 约会',
      material: '羊毛',
      thickness: '中等',
      pocketPresence: 'yes',
      pocketPosition: 'chest',
      chestMarkPresence: 'yes',
      chestMarkType: 'label',
      chestMarkPosition: 'chest-left',
      chestMarkText: 'Outdoor',
      fit: '合身',
      taxonomyTags: {
        color: ['黑色', '透明色'],
        colorFeeling: ['暖色', '赛博朋克'],
        occasion: ['通勤'],
      } as any,
      status: GarmentStatus.Laundry,
      price: '399.9',
      purchaseDate: '2026-05-01',
      purchaseChannel: '线下门店',
      notes: '适合办公室',
    });

    expect(garmentRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        subcategory: '西装',
        seasons: ['春', '秋', '冬'],
        styleTags: ['通勤', '法式'],
        sceneTags: ['上班', '约会'],
        material: '羊毛',
        thickness: '中等',
        pocketPresence: 'yes',
        pocketPosition: 'chest',
        chestMarkPresence: 'yes',
        chestMarkType: 'label',
        chestMarkPosition: 'chest-left',
        chestMarkText: 'Outdoor',
        fit: '合身',
        taxonomyTags: {
          color: ['黑色'],
          colorFeeling: ['暖色'],
          occasion: ['通勤'],
        },
        status: GarmentStatus.Wearable,
        price: 399.9,
        purchaseChannel: '线下门店',
        wearCount: 0,
      }),
    );
    expect(garment.purchaseDate).toEqual(new Date('2026-05-01'));
  });

  it('updates submitted metadata while preserving omitted values', async () => {
    const existing = Object.assign(new Garment(), {
      id: 1,
      category: 'tops',
      seasons: ['春'],
      styleTags: ['休闲'],
      sceneTags: ['周末'],
      pocketPresence: 'unknown',
      pocketPosition: 'unknown',
      chestMarkPresence: 'unknown',
      chestMarkType: 'unknown',
      chestMarkPosition: 'unknown',
      status: GarmentStatus.Wearable,
      wearCount: 3,
    });
    const { service, entityManager } = makeService(existing);

    const garment = await service.update(1, {
      subcategory: '衬衫',
      seasons: '夏,秋',
      pocketPresence: 'no',
      chestMarkPresence: 'yes',
      chestMarkType: 'text',
      chestMarkPosition: 'chest-left',
      chestMarkText: 'R',
      status: GarmentStatus.Laundry,
    });

    expect(garment.subcategory).toBe('衬衫');
    expect(garment.seasons).toEqual(['夏', '秋']);
    expect(garment.styleTags).toEqual(['休闲']);
    expect(garment.sceneTags).toEqual(['周末']);
    expect(garment.pocketPresence).toBe('no');
    expect(garment.pocketPosition).toBe('unknown');
    expect(garment.chestMarkPresence).toBe('yes');
    expect(garment.chestMarkType).toBe('text');
    expect(garment.chestMarkPosition).toBe('chest-left');
    expect(garment.chestMarkText).toBe('R');
    expect(garment.status).toBe(GarmentStatus.Wearable);
    expect(garment.wearCount).toBe(3);
    expect(entityManager.flush).toHaveBeenCalled();
  });

  it('filters garments by status, season, style, scene, and keyword metadata', async () => {
    const { service, garmentRepository } = makeService();
    garmentRepository.find.mockResolvedValue([
      Object.assign(new Garment(), {
        id: 1,
        category: 'outerwear',
        name: 'black blazer',
        status: GarmentStatus.Wearable,
        seasons: ['spring', 'autumn'],
        styleTags: ['commute'],
        sceneTags: ['office'],
        material: 'wool',
      }),
      Object.assign(new Garment(), {
        id: 2,
        category: 'outerwear',
        name: 'home hoodie',
        status: GarmentStatus.Laundry,
        seasons: ['winter'],
        styleTags: ['casual'],
        sceneTags: ['home'],
        material: 'cotton',
      }),
    ]);

    const garments = await service.findAll(undefined, {
      status: GarmentStatus.Wearable,
      season: 'autumn',
      style: 'commute',
      scene: 'office',
      keyword: 'wool',
    });

    expect(garments.map((garment) => garment.id)).toEqual([1]);
  });

  it('finds similar garments from an AI recognition draft', async () => {
    const { service, garmentRepository } = makeService();
    garmentRepository.find.mockResolvedValue([
      Object.assign(new Garment(), {
        id: 1,
        name: '黑色西装外套',
        category: 'outerwear',
        color: GarmentColor.BLACK,
        subcategory: '西装外套',
        seasons: ['秋', '冬'],
        styleTags: ['通勤'],
        sceneTags: ['上班'],
        material: '羊毛',
        thickness: '中等',
      }),
      Object.assign(new Garment(), {
        id: 2,
        name: '白色帆布鞋',
        category: 'footwear',
        color: GarmentColor.WHITE,
        subcategory: '帆布鞋',
      }),
    ]);

    const candidates = await service.findSimilarToDraft({
      category: 'outerwear',
      color: GarmentColor.BLACK,
      subcategory: '西装外套',
      seasons: ['冬'],
      styleTags: ['通勤'],
      sceneTags: ['上班'],
      material: '羊毛',
      thickness: '中等',
    });

    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({
      garment: expect.objectContaining({ id: 1 }),
      score: expect.any(Number),
      reasons: expect.arrayContaining(['分类相同', '颜色相同', '细分相同']),
    });
  });

  it('does not flag same-color short sleeve tops when details differ', async () => {
    const { service, garmentRepository } = makeService();
    garmentRepository.find.mockResolvedValue([
      Object.assign(new Garment(), {
        id: 1,
        name: '黑色短袖',
        category: 'tops',
        color: GarmentColor.BLACK,
        subcategory: '短袖T恤',
        seasons: ['夏'],
        styleTags: ['休闲'],
        sceneTags: ['日常'],
        material: '棉',
        thickness: '薄',
        pocketPresence: 'yes',
        pocketPosition: 'chest',
        chestMarkPresence: 'yes',
        chestMarkType: 'label',
        chestMarkPosition: 'chest-left',
        notes: '胸前口袋带白色标签',
      }),
    ]);

    const candidates = await service.findSimilarToDraft({
      category: 'tops',
      color: GarmentColor.BLACK,
      subcategory: '短袖T恤',
      seasons: ['夏'],
      styleTags: ['休闲'],
      sceneTags: ['日常'],
      material: '棉',
      thickness: '薄',
      pocketPresence: 'no',
      pocketPosition: 'unknown',
      chestMarkPresence: 'yes',
      chestMarkType: 'text',
      chestMarkPosition: 'chest-left',
      chestMarkText: 'r',
      notes: '黑色短袖，左胸前有一个很小的字母 r。',
    });

    expect(candidates).toEqual([]);
  });

  it('flags same-color short sleeve tops when distinctive details match', async () => {
    const { service, garmentRepository } = makeService();
    garmentRepository.find.mockResolvedValue([
      Object.assign(new Garment(), {
        id: 1,
        name: '黑色短袖',
        category: 'tops',
        color: GarmentColor.BLACK,
        subcategory: '短袖T恤',
        seasons: ['夏'],
        styleTags: ['休闲'],
        sceneTags: ['日常'],
        material: '棉',
        thickness: '薄',
        pocketPresence: 'no',
        pocketPosition: 'unknown',
        chestMarkPresence: 'yes',
        chestMarkType: 'text',
        chestMarkPosition: 'chest-left',
        chestMarkText: 'r',
        notes: '左胸前有一个很小的字母 r',
      }),
    ]);

    const candidates = await service.findSimilarToDraft({
      category: 'tops',
      color: GarmentColor.BLACK,
      subcategory: '短袖T恤',
      seasons: ['夏'],
      styleTags: ['休闲'],
      sceneTags: ['日常'],
      material: '棉',
      thickness: '薄',
      pocketPresence: 'no',
      pocketPosition: 'unknown',
      chestMarkPresence: 'yes',
      chestMarkType: 'text',
      chestMarkPosition: 'chest-left',
      chestMarkText: 'r',
      notes: '黑色短袖，左胸前有一个很小的字母 r。',
    });

    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({
      garment: expect.objectContaining({ id: 1 }),
      reasons: expect.arrayContaining([
        '胸前标识状态相同',
        '胸前标识类型相同',
        '胸前标识位置相同',
        '胸前文字相同',
      ]),
    });
  });

  it('does not treat shared absence of pocket and chest mark as strong duplicate evidence', async () => {
    const { service, garmentRepository } = makeService();
    garmentRepository.find.mockResolvedValue([
      Object.assign(new Garment(), {
        id: 3,
        name: '黑色夹克 A',
        category: 'outerwear',
        color: GarmentColor.BLACK,
        subcategory: '工装夹克',
        pocketPresence: 'no',
        pocketPosition: 'unknown',
        chestMarkPresence: 'no',
        chestMarkType: 'unknown',
        chestMarkPosition: 'unknown',
      }),
    ]);

    const candidates = await service.findSimilarToDraft({
      category: 'outerwear',
      color: GarmentColor.BLACK,
      subcategory: '飞行夹克',
      pocketPresence: 'no',
      pocketPosition: 'unknown',
      chestMarkPresence: 'no',
      chestMarkType: 'unknown',
      chestMarkPosition: 'unknown',
      notes: '黑色夹克，没有明显胸前细节。',
    });

    expect(candidates).toEqual([]);
  });
});
