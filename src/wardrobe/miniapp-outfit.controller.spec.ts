import { Garment } from '../dal/entity/garment.entity';
import { BadRequestException } from '@nestjs/common';
import { GarmentColor } from './garment-color.enum';
import { GarmentStatus } from './garment-status.enum';
import { MiniappOutfitController } from './miniapp-outfit.controller';
import { OutfitGeneratorService } from './recommendation/outfit-generator.service';

describe('MiniappOutfitController', () => {
  const makeGarment = (overrides: Partial<Garment> = {}) =>
    Object.assign(new Garment(), {
      id: 1,
      name: '白色衬衫',
      category: 'tops',
      color: GarmentColor.WHITE,
      status: GarmentStatus.Wearable,
      photo: { fileName: 'shirt.webp' },
      ...overrides,
    });

  const makeController = (userId?: number) => {
    const garmentService = {
      findAll: jest.fn(),
    };
    const outfitGeneratorService = {
      generateWithAi: jest.fn(),
    };
    const weatherService = {
      getContext: jest.fn(),
    };
    const controller = new (MiniappOutfitController as any)(
      garmentService as any,
      outfitGeneratorService as any,
      weatherService as any,
    );
    const req = {
      protocol: 'https',
      host: 'aimatchwear.asia',
      ...(userId == null ? {} : { user: { userId } }),
    } as any;
    return {
      controller,
      garmentService,
      outfitGeneratorService,
      weatherService,
      req,
    };
  };

  it('returns readiness status for miniapp outfit generation', async () => {
    const { controller, garmentService, req } = makeController();
    garmentService.findAll.mockResolvedValue([
      makeGarment(),
      makeGarment({ id: 2, status: GarmentStatus.Laundry }),
    ]);

    await expect(controller.ready(req)).resolves.toEqual({
      ready: true,
      garmentCount: 2,
    });
  });

  it('recommends outfits using existing generated AI plans', async () => {
    const {
      controller,
      garmentService,
      outfitGeneratorService,
      weatherService,
      req,
    } = makeController();
    const shirt = makeGarment();
    const pants = makeGarment({
      id: 2,
      name: '蓝色牛仔裤',
      category: 'bottoms',
      color: GarmentColor.BLUE,
      photo: { fileName: 'pants.webp' },
    });
    const unavailableContext = {
      status: 'unavailable',
      hourly: [],
      reason: '本次未使用实时温度。',
    };
    garmentService.findAll.mockResolvedValue([shirt, pants]);
    weatherService.getContext.mockResolvedValue(unavailableContext);
    outfitGeneratorService.generateWithAi.mockResolvedValue({
      plans: [],
      ai: {
        source: 'ai',
        recommendations: [
          {
            title: '清爽通勤',
            reason: '白衬衫和牛仔裤适合日常通勤。',
            cautions: [],
            garments: [shirt, pants],
          },
        ],
      },
    });

    const recommended = await controller.recommend(
      { requestText: '明天上班穿什么' },
      req,
    );
    expect(recommended).toEqual({
      source: 'ai',
      message: undefined,
      recommendations: [
        {
          title: '清爽通勤',
          reason: '白衬衫和牛仔裤适合日常通勤。',
          cautions: [],
          garments: [
            expect.objectContaining({
              id: 1,
              categoryLabel: '上衣',
              photoUrl: 'https://aimatchwear.asia/file/shirt.webp',
            }),
            expect.objectContaining({
              id: 2,
              categoryLabel: '下装',
              photoUrl: 'https://aimatchwear.asia/file/pants.webp',
            }),
          ],
        },
      ],
      weather: unavailableContext,
    });
    for (const garment of recommended.recommendations[0].garments) {
      expect(garment).not.toHaveProperty('status');
      expect(garment).not.toHaveProperty('statusLabel');
    }
    expect(outfitGeneratorService.generateWithAi).toHaveBeenCalledWith({
      mode: 'miniapp-taxonomy-v1',
      coreGarmentId: undefined,
      requestText: '明天上班穿什么',
      userId: undefined,
      temperatureContext: unavailableContext,
    });
  });

  it('uses the requested core garment id when miniapp asks from a garment detail page', async () => {
    const {
      controller,
      garmentService,
      outfitGeneratorService,
      weatherService,
      req,
    } = makeController();
    const shirt = makeGarment({ id: 1, category: 'tops' });
    const shoes = makeGarment({ id: 9, category: 'footwear' });
    const unavailableContext = {
      status: 'unavailable',
      hourly: [],
      reason: '本次未使用实时温度。',
    };
    garmentService.findAll.mockResolvedValue([shirt, shoes]);
    weatherService.getContext.mockResolvedValue(unavailableContext);
    outfitGeneratorService.generateWithAi.mockResolvedValue({
      plans: [
        {
          title: 'Around shoes',
          reason: 'Use selected shoes as the core item.',
          garments: [shoes, shirt],
        },
      ],
    });

    await controller.recommend(
      { requestText: 'Around this item', coreGarmentId: '9' },
      req,
    );

    expect(outfitGeneratorService.generateWithAi).toHaveBeenCalledWith({
      mode: 'miniapp-taxonomy-v1',
      coreGarmentId: 9,
      requestText: 'Around this item',
      userId: undefined,
      temperatureContext: unavailableContext,
    });
  });

  it('marks the wardrobe ready when it contains only non-wearable inventory', async () => {
    const { controller, garmentService, req } = makeController(42);
    garmentService.findAll.mockResolvedValue([
      makeGarment({ id: 8, status: GarmentStatus.Laundry }),
    ]);

    await expect(controller.ready(req)).resolves.toEqual({
      ready: true,
      garmentCount: 1,
    });
    expect(garmentService.findAll).toHaveBeenCalledWith(42, {});
  });

  it('orchestrates auto weather, the current user, and the normalized temperature context', async () => {
    const {
      controller,
      garmentService,
      outfitGeneratorService,
      weatherService,
      req,
    } = makeController(42);
    const shirt = makeGarment({ id: 11 });
    const autoWeather = {
      mode: 'auto',
      latitude: 31.2345,
      longitude: 121.5678,
    };
    const temperatureContext = {
      status: 'available',
      city: '上海市',
      currentC: 22,
      hourly: [],
      minC: 18,
      maxC: 25.1,
    };
    garmentService.findAll.mockResolvedValue([shirt]);
    weatherService.getContext.mockResolvedValue(temperatureContext);
    outfitGeneratorService.generateWithAi.mockResolvedValue({
      plans: [],
      ai: undefined,
    });

    const result = await controller.recommend(
      {
        requestText: '明天通勤穿什么',
        weather: autoWeather,
      } as any,
      req,
    );

    expect(weatherService.getContext).toHaveBeenCalledWith(autoWeather);
    expect(outfitGeneratorService.generateWithAi).toHaveBeenCalledWith(
      expect.objectContaining({
        requestText: '明天通勤穿什么',
        userId: 42,
        temperatureContext,
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        weather: temperatureContext,
      }),
    );
  });

  it('passes a manual city weather request through and exposes its weather basis', async () => {
    const {
      controller,
      garmentService,
      outfitGeneratorService,
      weatherService,
      req,
    } = makeController(7);
    const shirt = makeGarment({ id: 12 });
    const manualWeather = { mode: 'manual', city: '杭州市' };
    const temperatureContext = {
      status: 'available',
      city: '杭州市',
      currentC: 19,
      hourly: [],
      minC: 16,
      maxC: 23,
    };
    garmentService.findAll.mockResolvedValue([shirt]);
    weatherService.getContext.mockResolvedValue(temperatureContext);
    outfitGeneratorService.generateWithAi.mockResolvedValue({
      plans: [],
      ai: undefined,
    });

    const result = await controller.recommend(
      { weather: manualWeather } as any,
      req,
    );

    expect(weatherService.getContext).toHaveBeenCalledWith(manualWeather);
    expect(outfitGeneratorService.generateWithAi).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 7,
        temperatureContext,
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({ weather: temperatureContext }),
    );
  });

  it('continues generating after unavailable weather and reports the real degradation reason', async () => {
    const {
      controller,
      garmentService,
      outfitGeneratorService,
      weatherService,
      req,
    } = makeController(9);
    const shirt = makeGarment({ id: 13 });
    const unavailableContext = {
      status: 'unavailable',
      hourly: [],
      reason: '本次未使用实时温度。',
    };
    garmentService.findAll.mockResolvedValue([shirt]);
    weatherService.getContext.mockResolvedValue(unavailableContext);
    outfitGeneratorService.generateWithAi.mockResolvedValue({
      plans: [
        {
          title: '规则方案',
          reason: '按衣橱标签继续生成。',
          cautions: [],
          garments: [shirt],
        },
      ],
      ai: undefined,
    });

    const result = await controller.recommend(
      {
        requestText: '随便搭一套',
        coreGarmentId: 13,
        weather: { mode: 'unavailable' },
      } as any,
      req,
    );

    expect(weatherService.getContext).toHaveBeenCalledWith({
      mode: 'unavailable',
    });
    expect(outfitGeneratorService.generateWithAi).toHaveBeenCalledWith(
      expect.objectContaining({
        coreGarmentId: 13,
        userId: 9,
        temperatureContext: unavailableContext,
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        weather: expect.objectContaining({
          status: 'unavailable',
          reason: '本次未使用实时温度。',
        }),
        recommendations: [
          expect.objectContaining({
            cautions: [],
          }),
        ],
      }),
    );
  });

  it('preserves cautions from local generated plans', async () => {
    const {
      controller,
      garmentService,
      outfitGeneratorService,
      weatherService,
      req,
    } = makeController(10);
    const laundry = makeGarment({
      id: 14,
      status: GarmentStatus.Laundry,
    });
    const unavailableContext = {
      status: 'unavailable',
      hourly: [],
      reason: '本次未使用实时温度。',
    };
    garmentService.findAll.mockResolvedValue([laundry]);
    weatherService.getContext.mockResolvedValue(unavailableContext);
    outfitGeneratorService.generateWithAi.mockResolvedValue({
      plans: [
        {
          title: '本地规则方案',
          reason: '按衣橱标签生成。',
          cautions: [],
          garments: [laundry],
        },
      ],
      ai: undefined,
    });

    const result = await controller.recommend(
      { weather: { mode: 'unavailable' } } as any,
      req,
    );

    expect(result.recommendations[0].cautions).toEqual([]);
  });

  it('delegates default core selection to the generator when no core is supplied', async () => {
    const {
      controller,
      garmentService,
      outfitGeneratorService,
      weatherService,
      req,
    } = makeController(15);
    const laundry = makeGarment({ id: 21, status: GarmentStatus.Laundry });
    const unavailableContext = {
      status: 'unavailable',
      hourly: [],
      reason: '本次未使用实时温度。',
    };
    garmentService.findAll.mockResolvedValue([laundry]);
    weatherService.getContext.mockResolvedValue(unavailableContext);
    outfitGeneratorService.generateWithAi.mockResolvedValue({
      plans: [],
      ai: undefined,
    });

    await controller.recommend(
      { weather: { mode: 'unavailable' } } as any,
      req,
    );

    const generatorInput = outfitGeneratorService.generateWithAi.mock
      .calls[0]?.[0] as any;
    expect(generatorInput?.coreGarmentId).toBeUndefined();
    expect(generatorInput).toEqual(
      expect.objectContaining({
        userId: 15,
        temperatureContext: unavailableContext,
      }),
    );
  });

  it('returns garment status labels and preserves recommendation cautions', async () => {
    const {
      controller,
      garmentService,
      outfitGeneratorService,
      weatherService,
      req,
    } = makeController(18);
    const shirt = makeGarment({ id: 31 });
    const laundry = makeGarment({
      id: 32,
      name: '待洗半裙',
      category: 'bottoms',
      status: GarmentStatus.Laundry,
    });
    const unavailableContext = {
      status: 'unavailable',
      hourly: [],
      reason: '本次未使用实时温度。',
    };
    garmentService.findAll.mockResolvedValue([shirt, laundry]);
    weatherService.getContext.mockResolvedValue(unavailableContext);
    outfitGeneratorService.generateWithAi.mockResolvedValue({
      plans: [],
      ai: {
        source: 'ai',
        recommendations: [
          {
            title: '状态提醒方案',
            reason: '包含衣橱现有单品。',
            cautions: [],
            garmentIds: [31, 32],
            garments: [shirt, laundry],
          },
        ],
      },
    });

    const result = await controller.recommend(
      {
        coreGarmentId: 31,
        weather: { mode: 'unavailable' },
      } as any,
      req,
    );

    expect(result).toEqual(
      expect.objectContaining({
        weather: unavailableContext,
        recommendations: [
          expect.objectContaining({
            cautions: [],
            garments: expect.arrayContaining([
              expect.objectContaining({
                id: 32,
              }),
            ]),
          }),
        ],
      }),
    );
    for (const garment of result.recommendations[0].garments) {
      expect(garment).not.toHaveProperty('status');
      expect(garment).not.toHaveProperty('statusLabel');
    }
  });

  it.each([
    [
      'auto',
      { mode: 'auto', latitude: 31.2, longitude: 121.5 },
      {
        status: 'available',
        city: '上海市',
        currentC: 22,
        hourly: [],
        minC: 18,
        maxC: 25,
      },
    ],
    [
      'manual',
      { mode: 'manual', city: '杭州市' },
      {
        status: 'available',
        city: '杭州市',
        currentC: 20,
        hourly: [],
        minC: 16,
        maxC: 23,
      },
    ],
    [
      'unavailable',
      { mode: 'unavailable' },
      {
        status: 'unavailable',
        hourly: [],
        reason: '本次未使用实时温度。',
      },
    ],
  ])(
    'returns zero recommendations for an empty wardrobe with %s weather',
    async (_label, weather, temperatureContext) => {
      const garmentService = { findAll: jest.fn().mockResolvedValue([]) };
      const garmentRepository = { find: jest.fn().mockResolvedValue([]) };
      const outfitAiService = { recommend: jest.fn() };
      const generator = new OutfitGeneratorService(
        garmentRepository as any,
        outfitAiService as any,
      );
      const weatherService = {
        getContext: jest.fn().mockResolvedValue(temperatureContext),
      };
      const controller = new (MiniappOutfitController as any)(
        garmentService,
        generator,
        weatherService,
      );
      const req = {
        protocol: 'https',
        host: 'aimatchwear.asia',
        user: { userId: 52 },
      } as any;

      await expect(
        controller.recommend({ weather } as any, req),
      ).resolves.toEqual({
        source: 'fallback',
        message: undefined,
        recommendations: [],
        weather: temperatureContext,
      });
      expect(garmentRepository.find).toHaveBeenCalledWith(
        { owner: { id: 52 } },
        expect.any(Object),
      );
      expect(outfitAiService.recommend).not.toHaveBeenCalled();
    },
  );

  it.each([
    ['auto 缺少坐标', { mode: 'auto', latitude: 31.2 }],
    ['manual 城市为空', { mode: 'manual', city: '  ' }],
    ['未知天气模式', { mode: 'local', city: '上海市' }],
  ])('rejects malformed weather shape: %s', async (_label, weather) => {
    const {
      controller,
      garmentService,
      outfitGeneratorService,
      weatherService,
      req,
    } = makeController(23);
    garmentService.findAll.mockResolvedValue([makeGarment({ id: 41 })]);
    outfitGeneratorService.generateWithAi.mockResolvedValue({
      plans: [],
      ai: undefined,
    });

    await expect(controller.recommend({ weather } as any, req)).rejects.toThrow(
      BadRequestException,
    );
    expect(weatherService.getContext).not.toHaveBeenCalled();
    expect(outfitGeneratorService.generateWithAi).not.toHaveBeenCalled();
  });

  it('keeps the mini-program rule mode explicit when the client sends no weather field', async () => {
    const {
      controller,
      garmentService,
      outfitGeneratorService,
      weatherService,
      req,
    } = makeController(61);
    const unavailableContext = {
      status: 'unavailable',
      hourly: [],
      reason: '本次未使用实时温度。',
    };
    garmentService.findAll.mockResolvedValue([makeGarment({ id: 71 })]);
    weatherService.getContext.mockResolvedValue(unavailableContext);
    outfitGeneratorService.generateWithAi.mockResolvedValue({
      plans: [],
      ai: undefined,
    });

    const result = await controller.recommend(
      { requestText: '今天穿什么' } as any,
      req,
    );

    const generatorInput = outfitGeneratorService.generateWithAi.mock
      .calls[0]?.[0] as any;
    expect(generatorInput?.mode).toBe('miniapp-taxonomy-v1');
    expect(generatorInput?.temperatureContext?.status).toBe('unavailable');
    expect(weatherService.getContext).toHaveBeenCalledWith({
      mode: 'unavailable',
    });
    expect(result.weather).toEqual(unavailableContext);

    // 缺省与非法是两件事：缺省归一为 unavailable，非法仍必须报错且不落到天气服务和生成器
    const malformed = makeController(61);
    malformed.garmentService.findAll.mockResolvedValue([]);
    await expect(
      malformed.controller.recommend(
        { weather: { mode: 'local' } } as any,
        malformed.req,
      ),
    ).rejects.toThrow(BadRequestException);
    expect(malformed.weatherService.getContext).not.toHaveBeenCalled();
    expect(
      malformed.outfitGeneratorService.generateWithAi,
    ).not.toHaveBeenCalled();
  });

  it('drops the legacy no-wearable fallback message and still returns laundry garments without status cautions', async () => {
    const laundryTop = makeGarment({
      id: 81,
      name: '待洗上衣',
      category: 'tops',
      status: GarmentStatus.Laundry,
    });
    const laundryBottom = makeGarment({
      id: 82,
      name: '待洗长裤',
      category: 'bottoms',
      status: GarmentStatus.Laundry,
      photo: { fileName: 'pants.webp' },
    });
    const inventory = [laundryBottom, laundryTop];
    const garmentService = { findAll: jest.fn().mockResolvedValue(inventory) };
    const garmentRepository = { find: jest.fn().mockResolvedValue(inventory) };
    const outfitAiService = {
      recommend: jest
        .fn()
        .mockResolvedValue({ source: 'fallback', recommendations: [] }),
    };
    const generator = new OutfitGeneratorService(
      garmentRepository as any,
      outfitAiService as any,
    );
    const weatherService = {
      getContext: jest.fn().mockResolvedValue({
        status: 'unavailable',
        hourly: [],
        reason: '本次未使用实时温度。',
      }),
    };
    const controller = new (MiniappOutfitController as any)(
      garmentService,
      generator,
      weatherService,
    );
    const req = {
      protocol: 'https',
      host: 'aimatchwear.asia',
      user: { userId: 63 },
    } as any;

    const result = await controller.recommend(
      { requestText: '今天穿什么' } as any,
      req,
    );

    expect(result.message).not.toBe('衣橱里还没有可穿衣物，请先添加衣服。');
    expect(result.recommendations.length).toBeGreaterThan(0);
    expect(result.recommendations[0].cautions.join(' ')).not.toMatch(
      /状态提醒|待洗|收纳/,
    );
    for (const garment of result.recommendations[0].garments) {
      expect(garment).not.toHaveProperty('status');
      expect(garment).not.toHaveProperty('statusLabel');
    }
  });
});
