import { NotFoundException } from '@nestjs/common';
import { Garment } from '../../dal/entity/garment.entity';
import { GarmentStatus } from '../garment-status.enum';
import { OutfitGeneratorService } from './outfit-generator.service';

describe('OutfitGeneratorService', () => {
  const makeGarment = (data: Partial<Garment>) =>
    Object.assign(new Garment(), data);

  const makeService = (garments: Garment[]) => {
    const garmentRepository = {
      find: jest.fn(async () => garments),
    };
    const service = new OutfitGeneratorService(garmentRepository as any);
    return { service, garmentRepository };
  };

  it('generates three outfit plans from one wearable garment', async () => {
    const core = makeGarment({
      id: 1,
      name: '黑色西装外套',
      category: 'outerwear',
      color: 'black' as any,
      status: GarmentStatus.Wearable,
      sceneTags: ['通勤'],
      styleTags: ['法式'],
    });
    const { service } = makeService([
      core,
      makeGarment({
        id: 2,
        name: '白色衬衫',
        category: 'tops',
        color: 'white' as any,
        status: GarmentStatus.Wearable,
        sceneTags: ['通勤'],
      }),
      makeGarment({
        id: 3,
        name: '牛仔裤',
        category: 'bottoms',
        color: 'blue' as any,
        status: GarmentStatus.Wearable,
        styleTags: ['休闲'],
      }),
      makeGarment({
        id: 4,
        name: '乐福鞋',
        category: 'footwear',
        color: 'black' as any,
        status: GarmentStatus.Wearable,
      }),
      makeGarment({
        id: 5,
        name: '待洗半裙',
        category: 'bottoms',
        status: GarmentStatus.Laundry,
      }),
    ]);

    const plans = await service.generate({
      coreGarmentId: 1,
      requestText: '通勤',
    });

    expect(plans).toHaveLength(3);
    expect(plans.map((plan) => plan.title)).toEqual([
      '方案A：稳妥通勤',
      '方案B：年轻活泼',
      '方案C：舒适日常',
    ]);
    for (const plan of plans) {
      expect(plan.garments.map((garment) => garment.id)).toContain(1);
      expect(plan.garments.some((garment) => garment.id === 5)).toBe(false);
      expect(plan.slots.map((slot) => slot.garmentId)).toContain(1);
    }
  });

  it('throws when the core garment is not wearable or missing', async () => {
    const { service } = makeService([
      makeGarment({
        id: 1,
        name: '破损外套',
        category: 'outerwear',
        status: GarmentStatus.Damaged,
      }),
    ]);

    await expect(service.generate({ coreGarmentId: 1 })).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(service.generate({ coreGarmentId: 99 })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
