import { Garment } from '../dal/entity/garment.entity';
import { GarmentColor } from './garment-color.enum';
import { GarmentStatus } from './garment-status.enum';
import { MiniappOutfitController } from './miniapp-outfit.controller';

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

  const makeController = () => {
    const garmentService = {
      findAll: jest.fn(),
    };
    const outfitGeneratorService = {
      generateWithAi: jest.fn(),
    };
    const controller = new MiniappOutfitController(
      garmentService as any,
      outfitGeneratorService as any,
    );
    const req = { protocol: 'https', host: 'aimatchwear.asia' } as any;
    return { controller, garmentService, outfitGeneratorService, req };
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
      wearableCount: 1,
    });
  });

  it('recommends outfits using existing generated AI plans', async () => {
    const { controller, garmentService, outfitGeneratorService, req } =
      makeController();
    const shirt = makeGarment();
    const pants = makeGarment({
      id: 2,
      name: '蓝色牛仔裤',
      category: 'bottoms',
      color: GarmentColor.BLUE,
      photo: { fileName: 'pants.webp' },
    });
    garmentService.findAll.mockResolvedValue([shirt, pants]);
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

    await expect(
      controller.recommend({ requestText: '明天上班穿什么' }, req),
    ).resolves.toEqual({
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
    });
    expect(outfitGeneratorService.generateWithAi).toHaveBeenCalledWith({
      coreGarmentId: 1,
      requestText: '明天上班穿什么',
      userId: undefined,
    });
  });
});
