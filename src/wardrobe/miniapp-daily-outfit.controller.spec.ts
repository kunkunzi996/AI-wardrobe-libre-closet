import { Garment } from '../dal/entity/garment.entity';
import { OutfitCalendar } from '../dal/entity/outfit-calendar.entity';
import { Outfit } from '../dal/entity/outfit.entity';
import { GarmentColor } from './garment-color.enum';
import { GarmentStatus } from './garment-status.enum';
import { MiniappDailyOutfitController } from './miniapp-daily-outfit.controller';

describe('MiniappDailyOutfitController', () => {
  const makeGarment = (overrides: Partial<Garment> = {}) =>
    Object.assign(new Garment(), {
      id: 1,
      name: '白色T恤',
      category: 'tops',
      color: GarmentColor.WHITE,
      status: GarmentStatus.Wearable,
      photo: { fileName: 'shirt.webp' },
      ...overrides,
    });

  const makeOutfit = (garments: Garment[]) =>
    Object.assign(new Outfit(), {
      id: 18,
      name: '休闲通勤',
      notes: '白 T 搭配牛仔裤。',
      garments: { getItems: () => garments },
    });

  const makeEntry = (outfit: Outfit) =>
    Object.assign(new OutfitCalendar(), {
      id: 7,
      date: new Date('2026-06-13T00:00:00.000Z'),
      notes: '适合上班。',
      outfit: { unwrap: () => outfit },
    });

  const makeController = () => {
    const garmentService = {
      findAll: jest.fn(),
    };
    const outfitService = {
      create: jest.fn(),
    };
    const calendarService = {
      create: jest.fn(),
      findWeek: jest.fn(),
    };
    const controller = new MiniappDailyOutfitController(
      garmentService as any,
      outfitService as any,
      calendarService as any,
    );
    const req = { protocol: 'https', host: 'aimatchwear.asia' } as any;
    return { controller, garmentService, outfitService, calendarService, req };
  };

  it('saves recommended garments as today outfit', async () => {
    const { controller, garmentService, outfitService, calendarService, req } =
      makeController();
    const shirt = makeGarment();
    const pants = makeGarment({
      id: 2,
      name: '蓝色牛仔裤',
      category: 'bottoms',
      color: GarmentColor.BLUE,
      photo: { fileName: 'pants.webp' },
    });
    const outfit = makeOutfit([shirt, pants]);
    const entry = makeEntry(outfit);

    garmentService.findAll.mockResolvedValue([shirt, pants]);
    outfitService.create.mockResolvedValue(outfit);
    calendarService.create.mockResolvedValue(entry);

    await expect(
      controller.save(
        {
          date: '2026-06-13',
          title: '休闲通勤',
          reason: '白 T 和牛仔裤适合日常上班。',
          garmentIds: [1, 2],
        },
        req,
      ),
    ).resolves.toEqual({
      item: expect.objectContaining({
        id: 7,
        date: '2026-06-13',
        outfit: expect.objectContaining({
          id: 18,
          name: '休闲通勤',
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
        }),
      }),
    });
    expect(outfitService.create).toHaveBeenCalledWith(
      {
        name: '休闲通勤',
        notes: '白 T 和牛仔裤适合日常上班。',
        slots: [
          { category: 'tops', garmentId: 1 },
          { category: 'bottoms', garmentId: 2 },
        ],
      },
      undefined,
    );
    expect(calendarService.create).toHaveBeenCalledWith(
      {
        date: new Date('2026-06-13T00:00:00.000Z'),
        outfitId: 18,
        notes: '白 T 和牛仔裤适合日常上班。',
      },
      undefined,
    );
  });

  it('returns today daily outfits', async () => {
    const { controller, calendarService, req } = makeController();
    const outfit = makeOutfit([makeGarment()]);
    const entry = makeEntry(outfit);
    calendarService.findWeek.mockResolvedValue({
      weekStart: new Date('2026-06-07T00:00:00.000Z'),
      days: [
        { date: new Date('2026-06-12T00:00:00.000Z'), entries: [] },
        { date: new Date('2026-06-13T00:00:00.000Z'), entries: [entry] },
      ],
    });

    await expect(controller.today('2026-06-13', req)).resolves.toEqual({
      date: '2026-06-13',
      items: [
        expect.objectContaining({
          id: 7,
          outfit: expect.objectContaining({
            garments: [
              expect.objectContaining({
                id: 1,
                photoUrl: 'https://aimatchwear.asia/file/shirt.webp',
              }),
            ],
          }),
        }),
      ],
    });
  });
});
