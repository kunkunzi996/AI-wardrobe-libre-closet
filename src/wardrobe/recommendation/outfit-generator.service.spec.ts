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

  it('attaches AI recommendation garments for the template', async () => {
    const core = makeGarment({
      id: 1,
      name: '凉鞋',
      category: 'footwear',
      status: GarmentStatus.Wearable,
    });
    const shirt = makeGarment({
      id: 2,
      name: '白T',
      category: 'tops',
      status: GarmentStatus.Wearable,
    });
    const shorts = makeGarment({
      id: 3,
      name: '短裤',
      category: 'bottoms',
      status: GarmentStatus.Wearable,
    });
    const outfitAiService = {
      recommend: jest.fn().mockResolvedValue({
        source: 'ai',
        recommendations: [
          {
            title: '清爽日常',
            garmentIds: [1, 2, 3],
            reason: '轻薄单品更适合热天。',
            cautions: [],
          },
        ],
      }),
    };
    const garmentRepository = { find: jest.fn(async () => [core, shirt, shorts]) };
    const service = new OutfitGeneratorService(
      garmentRepository as any,
      outfitAiService as any,
    );

    const result = await service.generateWithAi({
      coreGarmentId: 1,
      requestText: '太热了，想穿清爽一点',
    });

    expect(result.ai?.recommendations[0].garments).toEqual([
      core,
      shirt,
      shorts,
    ]);
  });

  it('keeps the requested core garment in AI recommendations', async () => {
    const core = makeGarment({
      id: 1,
      name: 'Core jacket',
      category: 'outerwear',
      status: GarmentStatus.Wearable,
    });
    const pants = makeGarment({
      id: 2,
      name: 'Blue pants',
      category: 'bottoms',
      status: GarmentStatus.Wearable,
    });
    const outfitAiService = {
      recommend: jest.fn().mockResolvedValue({
        source: 'ai',
        recommendations: [
          {
            title: 'Work look',
            garmentIds: [2],
            reason: 'AI forgot to include the core garment.',
            cautions: [],
          },
        ],
      }),
    };
    const garmentRepository = { find: jest.fn(async () => [core, pants]) };
    const service = new OutfitGeneratorService(
      garmentRepository as any,
      outfitAiService as any,
    );

    const result = await service.generateWithAi({ coreGarmentId: 1 });

    expect(result.ai?.recommendations[0].garmentIds).toEqual([1, 2]);
    expect(result.ai?.recommendations[0].garments).toEqual([core, pants]);
  });

  it('uses complementary categories around a top instead of adding a dress', async () => {
    const core = makeGarment({
      id: 1,
      name: 'White shirt',
      category: 'tops',
      status: GarmentStatus.Wearable,
    });
    const pants = makeGarment({
      id: 2,
      name: 'Black pants',
      category: 'bottoms',
      status: GarmentStatus.Wearable,
    });
    const shoes = makeGarment({
      id: 3,
      name: 'Loafers',
      category: 'footwear',
      status: GarmentStatus.Wearable,
    });
    const dress = makeGarment({
      id: 4,
      name: 'Slip dress',
      category: 'dresses',
      status: GarmentStatus.Wearable,
    });
    const { service } = makeService([core, pants, shoes, dress]);

    const plans = await service.generate({ coreGarmentId: 1 });

    expect(plans[0].garments.map((garment) => garment.id)).toEqual([1, 2, 3]);
  });

  it('avoids heavy winter pieces for hot weather requests', async () => {
    const core = makeGarment({
      id: 1,
      name: '小白鞋',
      category: 'footwear',
      status: GarmentStatus.Wearable,
    });
    const puffer = makeGarment({
      id: 2,
      name: '羽绒服',
      category: 'outerwear',
      status: GarmentStatus.Wearable,
      seasons: ['winter'],
      styleTags: ['warm'],
      thickness: 'thick',
    });
    const tshirt = makeGarment({
      id: 3,
      name: '白T',
      category: 'tops',
      status: GarmentStatus.Wearable,
      seasons: ['summer'],
      thickness: 'thin',
    });
    const shorts = makeGarment({
      id: 4,
      name: '短裤',
      category: 'bottoms',
      status: GarmentStatus.Wearable,
      seasons: ['summer'],
      thickness: 'thin',
    });
    const { service } = makeService([core, puffer, tshirt, shorts]);

    const plans = await service.generate({
      coreGarmentId: 1,
      requestText: '最近太热了，想穿清爽一点',
    });

    expect(plans[0].garments.map((garment) => garment.id)).toEqual(
      expect.arrayContaining([1, 3, 4]),
    );
    expect(
      plans.flatMap((plan) => plan.garments).some((garment) => garment.id === 2),
    ).toBe(false);
  });
});
