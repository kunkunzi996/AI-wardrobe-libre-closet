import { Garment } from '../../dal/entity/garment.entity';
import { GarmentStatus } from '../garment-status.enum';
import { WardrobeRecommendationService } from './wardrobe-recommendation.service';

describe('WardrobeRecommendationService', () => {
  const makeGarment = (data: Partial<Garment>) =>
    Object.assign(new Garment(), data);

  const makeService = (garments: Garment[]) => {
    const garmentRepository = {
      find: jest.fn(() => Promise.resolve(garments)),
    };
    const service = new WardrobeRecommendationService(garmentRepository as any);
    return { service, garmentRepository };
  };

  it('prioritizes matching wearable garments and groups them by category', async () => {
    const { service } = makeService([
      makeGarment({
        id: 1,
        name: '黑色西装外套',
        category: 'outerwear',
        color: 'black' as any,
        status: GarmentStatus.Wearable,
        styleTags: ['法式'],
        sceneTags: ['通勤'],
      }),
      makeGarment({
        id: 2,
        name: '白色T恤',
        category: 'tops',
        color: 'white' as any,
        status: GarmentStatus.Wearable,
        styleTags: ['休闲'],
      }),
      makeGarment({
        id: 3,
        name: '黑色半裙',
        category: 'bottoms',
        color: 'black' as any,
        status: GarmentStatus.Laundry,
      }),
    ]);

    const result = await service.recommend(undefined, '今天想穿黑色系，通勤');

    expect(result.intent.colors).toEqual(['black']);
    expect(result.groups.map((group) => group.category)).toEqual([
      'outerwear',
      'tops',
    ]);
    expect(result.groups[0].garments.map((item) => item.garment.id)).toEqual([
      1,
    ]);
    expect(result.groups[0].garments[0].score).toBeGreaterThan(
      result.groups[1].garments[0].score,
    );
    expect(result.excluded).toEqual([
      expect.objectContaining({
        garment: expect.objectContaining({ id: 3 }),
        reason: 'not_wearable',
      }),
    ]);
  });

  it('excludes categories requested by natural language', async () => {
    const { service } = makeService([
      makeGarment({
        id: 1,
        name: '黑色连衣裙',
        category: 'dresses',
        color: 'black' as any,
        status: GarmentStatus.Wearable,
      }),
      makeGarment({
        id: 2,
        name: '黑色衬衫',
        category: 'tops',
        color: 'black' as any,
        status: GarmentStatus.Wearable,
      }),
    ]);

    const result = await service.recommend(undefined, '不想穿裙子，黑色');

    expect(result.groups.flatMap((group) => group.garments)).toEqual([
      expect.objectContaining({
        garment: expect.objectContaining({ id: 2 }),
      }),
    ]);
    expect(result.excluded).toEqual([
      expect.objectContaining({
        garment: expect.objectContaining({ id: 1 }),
        reason: 'excluded_category',
      }),
    ]);
  });
});
