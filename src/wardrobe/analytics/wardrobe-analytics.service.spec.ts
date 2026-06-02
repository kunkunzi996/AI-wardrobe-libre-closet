import { Garment } from '../../dal/entity/garment.entity';
import { GarmentStatus } from '../garment-status.enum';
import { WardrobeAnalyticsService } from './wardrobe-analytics.service';

describe('WardrobeAnalyticsService', () => {
  const makeGarment = (data: Partial<Garment>) =>
    Object.assign(new Garment(), data);

  const makeService = (garments: Garment[]) => {
    const garmentRepository = {
      find: jest.fn(async () => garments),
    };
    const service = new WardrobeAnalyticsService(garmentRepository as any);
    return { service, garmentRepository };
  };

  it('summarizes wardrobe usage and distributions', async () => {
    const now = new Date('2026-05-27T00:00:00.000Z');
    const { service } = makeService([
      makeGarment({
        id: 1,
        name: '黑色西装外套',
        category: 'outerwear',
        color: 'black' as any,
        status: GarmentStatus.Wearable,
        wearCount: 12,
        lastWornDate: new Date('2026-05-25T00:00:00.000Z'),
        styleTags: ['通勤'],
      }),
      makeGarment({
        id: 2,
        name: '白色衬衫',
        category: 'tops',
        color: 'white' as any,
        status: GarmentStatus.Wearable,
        wearCount: 1,
        lastWornDate: new Date('2025-12-01T00:00:00.000Z'),
        styleTags: ['简约'],
      }),
      makeGarment({
        id: 3,
        name: '待洗牛仔裤',
        category: 'bottoms',
        color: 'blue' as any,
        status: GarmentStatus.Laundry,
        wearCount: 4,
        styleTags: ['休闲'],
      }),
      makeGarment({
        id: 4,
        name: '黑色包',
        category: 'bags',
        color: 'black' as any,
        status: GarmentStatus.Wearable,
        wearCount: 0,
      }),
    ]);

    const result = await service.analyze(undefined, now);

    expect(result.summary).toEqual({
      total: 4,
      wearable: 3,
      laundry: 1,
      longUnworn: 2,
    });
    expect(result.mostWorn.map((item) => item.id)).toEqual([1, 3, 2]);
    expect(result.lowUsage.map((item) => item.id)).toEqual([4, 2]);
    expect(result.longUnworn.map((item) => item.id)).toEqual([2, 4]);
    expect(result.colorDistribution).toEqual([
      { label: '黑色', count: 2 },
      { label: '白色', count: 1 },
      { label: '蓝色', count: 1 },
    ]);
    expect(result.styleDistribution).toEqual(
      expect.arrayContaining([
        { label: '休闲', count: 1 },
        { label: '简约', count: 1 },
        { label: '通勤', count: 1 },
      ]),
    );
    expect(result.advice).toContain('下装数量较少，可以后续考虑补一件适合春秋的基础下装。');
    expect(result.advice.join('')).not.toContain('购买链接');
  });

  it('localizes English style tags in analytics distributions', async () => {
    const { service } = makeService([
      makeGarment({
        id: 10,
        name: 'AI test blazer',
        category: 'outerwear',
        color: 'black' as any,
        status: GarmentStatus.Wearable,
        wearCount: 0,
        styleTags: ['casual', 'business', 'classic', 'minimal'],
      }),
    ]);

    const result = await service.analyze(undefined, new Date('2026-05-27'));

    expect(result.styleDistribution).toEqual(
      expect.arrayContaining([
        { label: '休闲', count: 1 },
        { label: '商务', count: 1 },
        { label: '经典', count: 1 },
        { label: '极简', count: 1 },
      ]),
    );
  });
});
