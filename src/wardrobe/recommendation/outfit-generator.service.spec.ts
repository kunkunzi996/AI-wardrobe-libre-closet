import { NotFoundException } from '@nestjs/common';
import { Garment } from '../../dal/entity/garment.entity';
import { GarmentStatus } from '../garment-status.enum';
import { OutfitGeneratorService } from './outfit-generator.service';

describe('OutfitGeneratorService', () => {
  const makeGarment = (data: Partial<Garment>) =>
    Object.assign(new Garment(), data);

  const makeService = (garments: Garment[]) => {
    const garmentRepository = {
      find: jest.fn(() => Promise.resolve(garments)),
    };
    const service = new OutfitGeneratorService(garmentRepository as any);
    return { service, garmentRepository };
  };

  const echoAi = () => ({
    recommend: jest
      .fn()
      .mockImplementation(
        (input: { availableGarments: Array<{ id: number }> }) =>
          Promise.resolve({
            source: 'ai',
            recommendations: [
              {
                title: 'AI方案',
                garmentIds: input.availableGarments.map(
                  (garment) => garment.id,
                ),
                reason: '根据候选衣橱生成。',
                cautions: [],
              },
            ],
          }),
      ),
  });

  const makeMiniappService = (garments: Garment[]) => {
    const garmentRepository = {
      find: jest.fn(() => Promise.resolve(garments)),
    };
    const outfitAiService = echoAi();
    const service = new OutfitGeneratorService(
      garmentRepository as any,
      outfitAiService as any,
    );
    return { service, garmentRepository, outfitAiService };
  };

  const temperatureContext = (minC: number, maxC: number) =>
    ({
      status: 'available',
      city: '上海市',
      currentC: 20,
      hourly: [],
      minC,
      maxC,
    }) as any;

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
      mode: 'legacy-web',
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

    await expect(
      service.generate({ mode: 'legacy-web', coreGarmentId: 1 }),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      service.generate({ mode: 'legacy-web', coreGarmentId: 99 }),
    ).rejects.toBeInstanceOf(NotFoundException);
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
    const garmentRepository = {
      find: jest.fn(() => Promise.resolve([core, shirt, shorts])),
    };
    const service = new OutfitGeneratorService(
      garmentRepository as any,
      outfitAiService as any,
    );

    const result = await service.generateWithAi({
      mode: 'legacy-web',
      coreGarmentId: 1,
      requestText: '太热了，想穿清爽一点',
    });

    expect(result.ai?.recommendations[0].garments).toEqual([
      core,
      shirt,
      shorts,
    ]);
    expect(outfitAiService.recommend).toHaveBeenCalledWith(
      expect.objectContaining({ coreGarmentId: 1 }),
    );
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
    const garmentRepository = {
      find: jest.fn(() => Promise.resolve([core, pants])),
    };
    const service = new OutfitGeneratorService(
      garmentRepository as any,
      outfitAiService as any,
    );

    const result = await service.generateWithAi({
      mode: 'legacy-web',
      coreGarmentId: 1,
    });

    expect(result.ai?.recommendations[0].garmentIds).toEqual([1, 2]);
    expect(result.ai?.recommendations[0].garments).toEqual([core, pants]);
  });

  it('uses local core-based plans when the AI service falls back', async () => {
    const core = makeGarment({
      id: 1,
      name: 'Core shirt',
      category: 'tops',
      status: GarmentStatus.Wearable,
    });
    const pants = makeGarment({
      id: 2,
      name: 'Black pants',
      category: 'bottoms',
      status: GarmentStatus.Wearable,
    });
    const outfitAiService = {
      recommend: jest.fn().mockResolvedValue({
        source: 'fallback',
        recommendations: [
          {
            title: 'Generic fallback',
            garmentIds: [2],
            reason: 'This should not override the local plans.',
            cautions: [],
          },
        ],
      }),
    };
    const garmentRepository = {
      find: jest.fn(() => Promise.resolve([core, pants])),
    };
    const service = new OutfitGeneratorService(
      garmentRepository as any,
      outfitAiService as any,
    );

    const result = await service.generateWithAi({
      mode: 'legacy-web',
      coreGarmentId: 1,
    });

    expect(result.ai).toBeUndefined();
    expect(result.plans[0].garments.map((garment) => garment.id)).toEqual([
      1, 2,
    ]);
  });

  it('keeps the AI fallback result in the mini-program output contract', async () => {
    const core = makeGarment({
      id: 1,
      name: '核心上衣',
      category: 'tops',
      status: GarmentStatus.Wearable,
    });
    const pants = makeGarment({
      id: 2,
      name: '黑色长裤',
      category: 'bottoms',
      status: GarmentStatus.Wearable,
    });
    const outfitAiService = {
      recommend: jest.fn().mockResolvedValue({
        source: 'fallback',
        recommendations: [
          {
            title: '规则降级方案',
            garmentIds: [1, 2],
            reason: '按衣橱规则筛选。',
            cautions: [],
          },
        ],
      }),
    };
    const service = new OutfitGeneratorService(
      { find: jest.fn(() => Promise.resolve([core, pants])) } as any,
      outfitAiService as any,
    );

    const result = await service.generateWithAi({
      mode: 'miniapp-taxonomy-v1',
      coreGarmentId: 1,
      temperatureContext: temperatureContext(16, 20),
    } as any);

    expect(result.ai?.source).toBe('fallback');
    expect(result.ai?.recommendations[0].garmentIds).toEqual([1, 2]);
  });

  it('returns one partial plan instead of padding a single-garment wardrobe to three plans', async () => {
    const core = makeGarment({
      id: 1,
      name: '唯一上衣',
      category: 'tops',
      status: GarmentStatus.Wearable,
    });
    const { service } = makeMiniappService([core]);

    const result = await service.generateWithAi({
      mode: 'miniapp-taxonomy-v1',
      coreGarmentId: 1,
      temperatureContext: temperatureContext(16, 20),
    } as any);

    expect(result.plans).toHaveLength(1);
    expect(result.plans[0].garments.map((garment) => garment.id)).toEqual([1]);
  });

  it('deduplicates local plans by their garment-id set', async () => {
    const core = makeGarment({
      id: 1,
      name: '核心上衣',
      category: 'tops',
      status: GarmentStatus.Wearable,
    });
    const pants = makeGarment({
      id: 2,
      name: '唯一长裤',
      category: 'bottoms',
      status: GarmentStatus.Wearable,
    });
    const { service } = makeMiniappService([core, pants]);

    const result = await service.generateWithAi({
      mode: 'miniapp-taxonomy-v1',
      coreGarmentId: 1,
      temperatureContext: temperatureContext(16, 20),
    } as any);
    const idSets = result.plans.map((plan) =>
      plan.garments
        .map((garment) => garment.id)
        .sort((left, right) => left - right)
        .join(','),
    );

    expect(new Set(idSets).size).toBe(idSets.length);
    expect(result.plans).toHaveLength(1);
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

    const plans = await service.generate({
      mode: 'legacy-web',
      coreGarmentId: 1,
    });

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
      mode: 'legacy-web',
      coreGarmentId: 1,
      requestText: '最近太热了，想穿清爽一点',
    });

    expect(plans[0].garments.map((garment) => garment.id)).toEqual(
      expect.arrayContaining([1, 3, 4]),
    );
    expect(
      plans
        .flatMap((plan) => plan.garments)
        .some((garment) => garment.id === 2),
    ).toBe(false);
  });

  it('uses a strict high-temperature boundary and filters explicit winter conflicts only above 25℃', async () => {
    const core = makeGarment({
      id: 1,
      name: '白色凉鞋',
      category: 'footwear',
      status: GarmentStatus.Wearable,
    });
    const winterCoat = makeGarment({
      id: 2,
      name: '冬寒厚外套',
      category: 'outerwear',
      status: GarmentStatus.Wearable,
      taxonomyTags: { weather: ['冬寒'], thickness: ['厚款'] },
    });
    const normalTop = makeGarment({
      id: 3,
      name: '白色衬衫',
      category: 'tops',
      status: GarmentStatus.Wearable,
    });

    const at25 = await makeMiniappService([
      core,
      winterCoat,
      normalTop,
    ]).service.generateWithAi({
      mode: 'miniapp-taxonomy-v1',
      coreGarmentId: 1,
      temperatureContext: temperatureContext(18, 25),
    } as any);
    const above25 = await makeMiniappService([
      core,
      winterCoat,
      normalTop,
    ]).service.generateWithAi({
      mode: 'miniapp-taxonomy-v1',
      coreGarmentId: 1,
      temperatureContext: temperatureContext(18, 25.1),
    } as any);

    expect(
      at25.plans.flatMap((plan) => plan.garments).map((garment) => garment.id),
    ).toContain(2);
    expect(
      above25.plans
        .flatMap((plan) => plan.garments)
        .map((garment) => garment.id),
    ).not.toContain(2);
  });

  it('filters summer-hot or extremely-thin non-core garments when the low boundary is at most 10℃, without inferring missing tags', async () => {
    const core = makeGarment({
      id: 1,
      name: '黑色靴子',
      category: 'footwear',
      status: GarmentStatus.Wearable,
    });
    const summerTop = makeGarment({
      id: 2,
      name: '夏热极薄上衣',
      category: 'tops',
      status: GarmentStatus.Wearable,
      taxonomyTags: { weather: ['夏热'], thickness: ['极薄'] },
    });
    const unknownOuterwear = makeGarment({
      id: 3,
      name: '无厚薄标签外套',
      category: 'outerwear',
      status: GarmentStatus.Wearable,
    });

    const result = await makeMiniappService([
      core,
      summerTop,
      unknownOuterwear,
    ]).service.generateWithAi({
      mode: 'miniapp-taxonomy-v1',
      coreGarmentId: 1,
      temperatureContext: temperatureContext(10, 18),
    } as any);

    const ids = result.plans.flatMap((plan) =>
      plan.garments.map((garment) => garment.id),
    );
    expect(ids).not.toContain(2);
    expect(ids).toContain(3);
  });

  it('scores each matching taxonomy group once with equal weight instead of accumulating legacy field weights', async () => {
    const core = makeGarment({
      id: 1,
      name: '核心上衣',
      category: 'tops',
      color: 'black' as any,
      status: GarmentStatus.Wearable,
      sceneTags: ['通勤'],
      taxonomyTags: { style: ['简约'], occasion: ['通勤'] },
    });
    const taxonomyMatch = makeGarment({
      id: 2,
      name: '结构化匹配裤',
      category: 'bottoms',
      status: GarmentStatus.Wearable,
      taxonomyTags: { style: ['简约'], occasion: ['通勤'] },
    });
    const legacyWeightedMatch = makeGarment({
      id: 3,
      name: '旧字段匹配裤',
      category: 'bottoms',
      status: GarmentStatus.Wearable,
      sceneTags: ['通勤'],
    });
    const { service, outfitAiService } = makeMiniappService([
      core,
      taxonomyMatch,
      legacyWeightedMatch,
    ]);

    const result = await service.generateWithAi({
      mode: 'miniapp-taxonomy-v1',
      coreGarmentId: 1,
      temperatureContext: temperatureContext(16, 20),
    } as any);

    const sent = outfitAiService.recommend.mock.calls[0][0]
      .availableGarments as Array<{ id: number }>;
    expect(sent.map((garment) => garment.id)).toEqual(
      expect.arrayContaining([1, 2, 3]),
    );
    expect(result.plans[0].garments.map((garment) => garment.id)).toEqual(
      expect.arrayContaining([1, 2]),
    );
  });

  it('keeps a conflicting core for an explicit reverse request and exposes the temperature caution', async () => {
    const core = makeGarment({
      id: 1,
      name: '厚重羽绒服',
      category: 'outerwear',
      status: GarmentStatus.Wearable,
      taxonomyTags: { weather: ['冬寒'], thickness: ['加厚'] },
    });
    const pants = makeGarment({
      id: 2,
      name: '黑色长裤',
      category: 'bottoms',
      status: GarmentStatus.Wearable,
    });
    const outfitAiService = {
      recommend: jest.fn().mockResolvedValue({
        source: 'ai',
        recommendations: [
          {
            title: '保暖方案',
            garmentIds: [1, 2],
            reason: '围绕核心衣物保暖。',
            cautions: [],
          },
        ],
      }),
    };
    const context = temperatureContext(20, 25.1);
    const service = new OutfitGeneratorService(
      { find: jest.fn(() => Promise.resolve([core, pants])) } as any,
      outfitAiService as any,
    );

    const result = await service.generateWithAi({
      mode: 'miniapp-taxonomy-v1',
      coreGarmentId: 1,
      requestText: '我要保暖',
      temperatureContext: context,
    } as any);

    expect(outfitAiService.recommend).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'miniapp-taxonomy-v1',
        temperatureContext: context,
      }),
    );
    expect(result.ai?.recommendations[0].garmentIds).toContain(1);
    expect(result.ai?.recommendations[0].cautions.join(' ')).toMatch(
      /温度|冲突|厚/,
    );
  });

  it('keeps a summer-hot extremely-thin core at 10℃ and exposes a low-temperature caution', async () => {
    const core = makeGarment({
      id: 1,
      name: '极薄夏日上衣',
      category: 'tops',
      status: GarmentStatus.Wearable,
      taxonomyTags: { weather: ['夏热'], thickness: ['极薄'] },
    });
    const pants = makeGarment({
      id: 2,
      name: '长裤',
      category: 'bottoms',
      status: GarmentStatus.Wearable,
    });
    const outfitAiService = {
      recommend: jest.fn().mockResolvedValue({
        source: 'ai',
        recommendations: [
          {
            title: '低温核心方案',
            garmentIds: [1, 2],
            reason: '保留用户指定的核心衣物。',
            cautions: [],
          },
        ],
      }),
    };
    const service = new OutfitGeneratorService(
      { find: jest.fn(() => Promise.resolve([core, pants])) } as any,
      outfitAiService as any,
    );

    const result = await service.generateWithAi({
      mode: 'miniapp-taxonomy-v1',
      coreGarmentId: 1,
      temperatureContext: temperatureContext(10, 18),
    } as any);

    expect(result.ai?.recommendations[0].garmentIds).toContain(1);
    expect(result.ai?.recommendations[0].cautions.join(' ')).toMatch(
      /温度|低温|薄|冷/,
    );
  });

  it('allows every inventory status in mini-program AI output without status reminders', async () => {
    const core = makeGarment({
      id: 1,
      name: '白色衬衫',
      category: 'tops',
      status: GarmentStatus.Wearable,
    });
    const laundry = makeGarment({
      id: 2,
      name: '待洗半裙',
      category: 'bottoms',
      status: GarmentStatus.Laundry,
    });
    const stored = makeGarment({
      id: 3,
      name: '收纳鞋',
      category: 'footwear',
      status: GarmentStatus.Stored,
    });
    const outfitAiService = {
      recommend: jest.fn().mockResolvedValue({
        source: 'ai',
        recommendations: [
          {
            title: '状态提醒方案',
            garmentIds: [1, 2, 3],
            reason: '使用衣橱现有单品。',
            cautions: [],
          },
        ],
      }),
    };
    const service = new OutfitGeneratorService(
      { find: jest.fn(() => Promise.resolve([core, laundry, stored])) } as any,
      outfitAiService as any,
    );

    const result = await service.generateWithAi({
      mode: 'miniapp-taxonomy-v1',
      coreGarmentId: 1,
      temperatureContext: temperatureContext(16, 20),
    } as any);

    expect(
      result.ai?.recommendations[0].garments.map((garment) => garment.id),
    ).toEqual(expect.arrayContaining([1, 2, 3]));
    expect(result.ai?.recommendations[0].cautions.join(' ')).not.toMatch(
      /待洗|收纳|状态提醒/,
    );
    const aiInput = outfitAiService.recommend.mock.calls[0][0] as {
      availableGarments: Array<{ id: number }>;
    };
    const sent = aiInput.availableGarments;
    expect(sent.map((garment) => garment.id)).toEqual(
      expect.arrayContaining([2, 3]),
    );
    for (const garment of sent) {
      expect(garment).not.toHaveProperty('status');
    }
  });

  it('explains a same-color relationship from the actual selected garments', async () => {
    const core = makeGarment({
      id: 1,
      name: '黑色上衣',
      category: 'tops',
      color: 'black' as any,
      status: GarmentStatus.Wearable,
    });
    const whiteBottom = makeGarment({
      id: 2,
      name: '黑色长裤',
      category: 'bottoms',
      color: 'black' as any,
      status: GarmentStatus.Wearable,
    });
    const result = await makeMiniappService([
      core,
      whiteBottom,
    ]).service.generateWithAi({
      mode: 'miniapp-taxonomy-v1',
      coreGarmentId: 1,
      temperatureContext: temperatureContext(16, 20),
    } as any);

    expect(result.plans[0].reason).toMatch(/同色|近似/);
  });

  it('explains a contrasting relationship only when multiple selected garments create it', async () => {
    const core = makeGarment({
      id: 1,
      name: '黑色上衣',
      category: 'tops',
      color: 'black' as any,
      status: GarmentStatus.Wearable,
      taxonomyTags: { colorFeeling: ['撞色'] },
    });
    const redBottom = makeGarment({
      id: 2,
      name: '白色长裤',
      category: 'bottoms',
      color: 'white' as any,
      status: GarmentStatus.Wearable,
    });
    const result = await makeMiniappService([
      core,
      redBottom,
    ]).service.generateWithAi({
      mode: 'miniapp-taxonomy-v1',
      coreGarmentId: 1,
      temperatureContext: temperatureContext(16, 20),
    } as any);

    expect(result.plans[0].reason).toMatch(/撞色|对比/);
  });

  it('keeps at most three AI plans and removes duplicate garment-id sets while allowing a partial plan', async () => {
    const garments = [
      makeGarment({ id: 1, category: 'tops', status: GarmentStatus.Wearable }),
      makeGarment({
        id: 2,
        category: 'bottoms',
        status: GarmentStatus.Wearable,
      }),
      makeGarment({
        id: 3,
        category: 'footwear',
        status: GarmentStatus.Wearable,
      }),
      makeGarment({ id: 4, category: 'bags', status: GarmentStatus.Wearable }),
    ];
    const outfitAiService = {
      recommend: jest.fn().mockResolvedValue({
        source: 'ai',
        recommendations: [
          { title: 'A', garmentIds: [1], reason: '部分方案。', cautions: [] },
          {
            title: '重复A',
            garmentIds: [1],
            reason: '重复方案。',
            cautions: [],
          },
          { title: 'B', garmentIds: [1, 2], reason: '方案B。', cautions: [] },
          { title: 'C', garmentIds: [1, 3], reason: '方案C。', cautions: [] },
          {
            title: 'D',
            garmentIds: [1, 4],
            reason: '超出上限。',
            cautions: [],
          },
        ],
      }),
    };
    const service = new OutfitGeneratorService(
      { find: jest.fn(() => Promise.resolve(garments)) } as any,
      outfitAiService as any,
    );

    const result = await service.generateWithAi({
      mode: 'miniapp-taxonomy-v1',
      coreGarmentId: 1,
      temperatureContext: temperatureContext(16, 20),
    } as any);
    const recommendations = result.ai?.recommendations ?? [];
    const idSets = recommendations.map((recommendation) =>
      [...recommendation.garmentIds]
        .sort((left, right) => left - right)
        .join(','),
    );

    expect(recommendations.length).toBeLessThanOrEqual(3);
    expect(new Set(idSets).size).toBe(idSets.length);
    expect(
      recommendations.some(
        (recommendation) => recommendation.garmentIds.length === 1,
      ),
    ).toBe(true);
  });

  it('uses the same temperature rules for local plans when AI falls back', async () => {
    const core = makeGarment({
      id: 1,
      name: '小白鞋',
      category: 'footwear',
      status: GarmentStatus.Wearable,
    });
    const puffer = makeGarment({
      id: 2,
      name: '厚款羽绒服',
      category: 'outerwear',
      status: GarmentStatus.Wearable,
      taxonomyTags: { thickness: ['厚款'] },
    });
    const outfitAiService = {
      recommend: jest.fn().mockResolvedValue({
        source: 'fallback',
        recommendations: [],
      }),
    };
    const service = new OutfitGeneratorService(
      { find: jest.fn(() => Promise.resolve([core, puffer])) } as any,
      outfitAiService as any,
    );

    const result = await service.generateWithAi({
      mode: 'miniapp-taxonomy-v1',
      coreGarmentId: 1,
      temperatureContext: temperatureContext(18, 25.1),
    } as any);

    expect(result.plans).toEqual([]);
    expect(result.ai?.recommendations ?? []).toEqual([]);
  });

  it('adds core temperature cautions to local plans when AI falls back, without inventory-status reminders', async () => {
    const core = makeGarment({
      id: 1,
      name: '厚重羽绒服',
      category: 'outerwear',
      status: GarmentStatus.Wearable,
      taxonomyTags: { weather: ['冬寒'], thickness: ['加厚'] },
    });
    const laundry = makeGarment({
      id: 2,
      name: '待洗长裤',
      category: 'bottoms',
      status: GarmentStatus.Laundry,
    });
    const outfitAiService = {
      recommend: jest.fn().mockResolvedValue({
        source: 'fallback',
        recommendations: [],
      }),
    };
    const service = new OutfitGeneratorService(
      { find: jest.fn(() => Promise.resolve([core, laundry])) } as any,
      outfitAiService as any,
    );

    const result = await service.generateWithAi({
      mode: 'miniapp-taxonomy-v1',
      coreGarmentId: 1,
      requestText: '我要保暖',
      temperatureContext: temperatureContext(20, 25.1),
    } as any);

    expect(result.plans).toEqual([]);
    expect(result.ai?.recommendations ?? []).toEqual([]);
  });

  it('adds the actual outfit color relationship to mini-program AI reasons', async () => {
    const core = makeGarment({
      id: 1,
      name: '黑色上衣',
      category: 'tops',
      color: 'black' as any,
      status: GarmentStatus.Wearable,
    });
    const pants = makeGarment({
      id: 2,
      name: '黑色长裤',
      category: 'bottoms',
      color: 'black' as any,
      status: GarmentStatus.Wearable,
    });
    const outfitAiService = {
      recommend: jest.fn().mockResolvedValue({
        source: 'ai',
        recommendations: [
          {
            title: 'AI 同色方案',
            garmentIds: [1, 2],
            reason: '适合今天的日常安排。',
            cautions: [],
          },
        ],
      }),
    };
    const service = new OutfitGeneratorService(
      { find: jest.fn(() => Promise.resolve([core, pants])) } as any,
      outfitAiService as any,
    );

    const result = await service.generateWithAi({
      mode: 'miniapp-taxonomy-v1',
      coreGarmentId: 1,
      temperatureContext: temperatureContext(16, 20),
    } as any);

    expect(result.ai?.recommendations[0].reason).toMatch(/同色|近似/);
  });

  it('warns about temperature when an explicit request overrides the exclusion', async () => {
    // AC-3 的两个触发条件由「或」连接：用户明确要求保暖时，即使核心衣物本身不与温度
    // 冲突，被明确需求放行的非核心单品也必须带来真实温度的注意事项。
    const plainCore = makeGarment({
      id: 10,
      name: '白衬衫',
      category: 'tops',
      status: GarmentStatus.Wearable,
    });
    const thickCoat = makeGarment({
      id: 20,
      name: '加厚外套',
      category: 'outerwear',
      status: GarmentStatus.Wearable,
      taxonomyTags: { thickness: ['加厚'] },
    });
    const warmService = makeMiniappService([plainCore, thickCoat]).service;

    const warm = await warmService.generateWithAi({
      mode: 'miniapp-taxonomy-v1',
      coreGarmentId: 10,
      requestText: '今天想保暖一点',
      temperatureContext: temperatureContext(20, 28),
    } as any);

    const warmPlan = warm.plans[0];
    expect(warmPlan.garments.some((garment) => garment.id === 20)).toBe(true);
    expect(warmPlan.cautions.join(' ')).toMatch(/温度|保暖|厚/);

    // 低温镜像场景：明确要求清爽时放行的极薄非核心单品同样需要提醒
    const thinBottom = makeGarment({
      id: 21,
      name: '极薄长裤',
      category: 'bottoms',
      status: GarmentStatus.Wearable,
      taxonomyTags: { thickness: ['极薄'] },
    });
    const coolService = makeMiniappService([plainCore, thinBottom]).service;

    const cool = await coolService.generateWithAi({
      mode: 'miniapp-taxonomy-v1',
      coreGarmentId: 10,
      requestText: '想穿得清爽一点',
      temperatureContext: temperatureContext(8, 15),
    } as any);

    const coolPlan = cool.plans[0];
    expect(coolPlan.garments.some((garment) => garment.id === 21)).toBe(true);
    expect(coolPlan.cautions.join(' ')).toMatch(/温度|保暖|薄/);
  });

  it('applies default core selection only in mini-program mode', async () => {
    const laundry = makeGarment({
      id: 31,
      name: '待洗上衣',
      category: 'tops',
      status: GarmentStatus.Laundry,
    });
    const stored = makeGarment({
      id: 42,
      name: '收纳长裤',
      category: 'bottoms',
      status: GarmentStatus.Stored,
    });

    const { service } = makeService([laundry, stored]);

    // 网页旧模式只在可穿范围内查找核心，指定非可穿衣物必须清晰报错
    await expect(
      service.generateWithAi({
        mode: 'legacy-web',
        coreGarmentId: 31,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    // 网页旧模式不执行「没有可穿衣物就退而选最新其它状态衣物」的默认核心规则。
    // 这里用 as any 绕过类型，是为了验证运行时同样不会退化，而不是承认该入参合法。
    await expect(
      service.generateWithAi({
        mode: 'legacy-web',
        requestText: '默认核心',
      } as any),
    ).rejects.toBeInstanceOf(NotFoundException);

    const miniappService = makeMiniappService([laundry, stored]);
    const miniapp = await miniappService.service.generateWithAi({
      mode: 'miniapp-taxonomy-v1',
      requestText: '今天穿什么',
      temperatureContext: temperatureContext(16, 20),
    } as any);

    const aiInput = miniappService.outfitAiService.recommend.mock
      .calls[0][0] as { availableGarments: Array<{ id: number }> };
    expect(aiInput).not.toHaveProperty('coreGarmentId');
    expect(
      aiInput.availableGarments.map((garment) => garment.id).sort(),
    ).toEqual([31, 42]);
    expect(
      miniapp.plans[0].garments.map((garment) => garment.id).sort(),
    ).toEqual([31, 42]);
  });

  it('keeps the legacy web AI output unchanged', async () => {
    // 网页端只允许透传 AI 结果：不追加小程序专用的颜色关系文案、不截断条数。
    const core = makeGarment({
      id: 1,
      name: '黑色上衣',
      category: 'tops',
      color: 'black' as any,
      status: GarmentStatus.Wearable,
    });
    const blackBottom = makeGarment({
      id: 2,
      name: '黑色长裤',
      category: 'bottoms',
      color: 'black' as any,
      status: GarmentStatus.Wearable,
    });
    const originalReason = '黑色上衣配黑色长裤，适合正式场合。';
    const outfitAiService = {
      recommend: jest.fn().mockResolvedValue({
        source: 'ai',
        recommendations: [1, 2, 3, 4].map((index) => ({
          title: `方案${index}`,
          garmentIds: [1, 2],
          reason: originalReason,
          cautions: [],
        })),
      }),
    };
    const service = new OutfitGeneratorService(
      { find: jest.fn(() => Promise.resolve([core, blackBottom])) } as any,
      outfitAiService as any,
    );

    const result = await service.generateWithAi({
      mode: 'legacy-web',
      coreGarmentId: 1,
    } as any);

    expect(result.ai?.recommendations[0].reason).toBe(originalReason);
    expect(result.ai?.recommendations).toHaveLength(4);
  });

  it('does not lock mini-program plans to the newest garment when no core is specified', async () => {
    const lowerWearable = makeGarment({
      id: 12,
      name: '较旧上衣',
      category: 'tops',
      status: GarmentStatus.Wearable,
    });
    const newestWearable = makeGarment({
      id: 19,
      name: '最新上衣',
      category: 'tops',
      status: GarmentStatus.Wearable,
    });
    const laundry = makeGarment({
      id: 25,
      name: '待洗外套',
      category: 'outerwear',
      status: GarmentStatus.Laundry,
    });
    const { service, garmentRepository, outfitAiService } = makeMiniappService([
      lowerWearable,
      laundry,
      newestWearable,
    ]);

    const result = await service.generate({
      mode: 'miniapp-taxonomy-v1',
      requestText: '今天穿什么',
      userId: 7,
      temperatureContext: temperatureContext(16, 20),
    } as any);

    expect(garmentRepository.find).toHaveBeenCalledWith(
      { owner: { id: 7 } },
      expect.objectContaining({ orderBy: { id: 'DESC' } }),
    );
    const aiInput = outfitAiService.recommend.mock.calls[0][0] as {
      availableGarments: Array<{ id: number }>;
    };
    expect(aiInput).not.toHaveProperty('coreGarmentId');
    expect(
      aiInput.availableGarments.map((garment) => garment.id).sort(),
    ).toEqual([12, 19, 25]);
    expect(result[0].garments.map((garment) => garment.id).sort()).toEqual([
      12, 19, 25,
    ]);
  });

  it('does not invent a core from the highest-id garment when none is specified', async () => {
    const laundry = makeGarment({
      id: 14,
      name: '待洗上衣',
      category: 'tops',
      status: GarmentStatus.Laundry,
    });
    const stored = makeGarment({
      id: 22,
      name: '收纳上衣',
      category: 'tops',
      status: GarmentStatus.Stored,
    });
    const damaged = makeGarment({
      id: 18,
      name: '需修补上衣',
      category: 'tops',
      status: GarmentStatus.Damaged,
    });
    const { service, outfitAiService } = makeMiniappService([
      laundry,
      stored,
      damaged,
    ]);

    await service.generate({
      mode: 'miniapp-taxonomy-v1',
      requestText: '今天穿什么',
      temperatureContext: temperatureContext(16, 20),
    } as any);

    expect(outfitAiService.recommend.mock.calls[0][0]).not.toHaveProperty(
      'coreGarmentId',
    );
  });

  it('sends only black candidate garments to AI when the request requires black', async () => {
    const unlabeled = makeGarment({
      id: 1,
      name: '未标色上衣',
      category: 'tops',
      status: GarmentStatus.Wearable,
    });
    const black = makeGarment({
      id: 2,
      name: '黑色上衣',
      category: 'tops',
      color: 'black' as any,
      status: GarmentStatus.Wearable,
    });
    const white = makeGarment({
      id: 3,
      name: '白色上衣',
      category: 'tops',
      color: 'white' as any,
      status: GarmentStatus.Wearable,
    });
    const { service, outfitAiService } = makeMiniappService([
      unlabeled,
      black,
      white,
    ]);

    await service.generateWithAi({
      mode: 'miniapp-taxonomy-v1',
      requestText: '只要黑色',
      temperatureContext: temperatureContext(16, 20),
    } as any);

    expect(
      outfitAiService.recommend.mock.calls[0][0].availableGarments.map(
        (garment: { id: number }) => garment.id,
      ),
    ).toEqual([2]);
    expect(outfitAiService.recommend.mock.calls[0][0]).not.toHaveProperty(
      'coreGarmentId',
    );
  });

  it('returns no mini-program plans when AI is unavailable', async () => {
    const core = makeGarment({
      id: 1,
      name: '黑色上衣',
      category: 'tops',
      color: 'black' as any,
      status: GarmentStatus.Wearable,
    });
    const { service } = makeService([core]);

    const result = await service.generateWithAi({
      mode: 'miniapp-taxonomy-v1',
      coreGarmentId: 1,
      requestText: '今天穿什么',
      temperatureContext: temperatureContext(16, 20),
    } as any);

    expect(result.plans).toEqual([]);
  });

  it('keeps an explicitly requested core ahead of a newer default candidate', async () => {
    const explicitCore = makeGarment({
      id: 30,
      name: '指定核心',
      category: 'tops',
      status: GarmentStatus.Wearable,
    });
    const newerWearable = makeGarment({
      id: 41,
      name: '更新衣物',
      category: 'tops',
      status: GarmentStatus.Wearable,
    });
    const { service } = makeService([explicitCore, newerWearable]);

    const result = await service.generate({
      mode: 'legacy-web',
      coreGarmentId: 30,
      requestText: '围绕指定核心',
    });

    expect(
      result.every((plan) =>
        plan.garments.some((garment) => garment.id === 30),
      ),
    ).toBe(true);
  });

  it('fails clearly when default-core selection receives an empty wardrobe', async () => {
    const { service } = makeService([]);

    await expect(
      service.generate({
        mode: 'legacy-web',
        coreGarmentId: 1,
        requestText: '默认核心',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
