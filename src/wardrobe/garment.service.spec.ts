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
      find: jest.fn(async () => []),
      findOne: jest.fn(async () => existingGarment ?? null),
      getEntityManager: jest.fn(() => entityManager),
    };

    const service = new GarmentService(
      garmentRepository as any,
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
      color: GarmentColor.Black,
      size: 'm',
      seasons: '春, 秋，冬',
      styleTags: ['通勤', '法式'],
      sceneTags: '上班, 约会',
      material: '羊毛',
      thickness: '中等',
      fit: '合身',
      status: GarmentStatus.Wearable,
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
        fit: '合身',
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
      status: GarmentStatus.Wearable,
      wearCount: 3,
    });
    const { service, entityManager } = makeService(existing);

    const garment = await service.update(1, {
      subcategory: '衬衫',
      seasons: '夏,秋',
      status: GarmentStatus.Laundry,
    });

    expect(garment.subcategory).toBe('衬衫');
    expect(garment.seasons).toEqual(['夏', '秋']);
    expect(garment.styleTags).toEqual(['休闲']);
    expect(garment.sceneTags).toEqual(['周末']);
    expect(garment.status).toBe(GarmentStatus.Laundry);
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
});
