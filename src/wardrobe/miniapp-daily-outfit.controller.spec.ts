import { Readable } from 'node:stream';
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

  const makeOutfit = (garments: Garment[], overrides: Partial<Outfit> = {}) =>
    Object.assign(new Outfit(), {
      id: 18,
      name: '休闲通勤',
      notes: '白 T 搭配牛仔裤。',
      photo: { fileName: 'look.webp' },
      garments: { getItems: () => garments },
      ...overrides,
    });

  const makeEntry = (outfit: Outfit, overrides: Partial<OutfitCalendar> = {}) =>
    Object.assign(new OutfitCalendar(), {
      id: 7,
      date: new Date('2026-06-13T00:00:00.000Z'),
      notes: '适合上班。',
      scene: '通勤',
      rating: 5,
      feedback: '显精神',
      outfit: { unwrap: () => outfit },
      ...overrides,
    });

  const makeUpload = (fields: Record<string, string> = {}) =>
    ({
      mimetype: 'image/jpeg',
      file: Readable.from(Buffer.from('fake image')),
      fields: Object.fromEntries(
        Object.entries(fields).map(([key, value]) => [key, { value }]),
      ),
    }) as any;

  const makeController = () => {
    const garmentService = {
      findAll: jest.fn(),
    };
    const outfitService = {
      create: jest.fn(),
      remove: jest.fn(),
    };
    const calendarService = {
      create: jest.fn(),
      findWeek: jest.fn(),
      findOwnedEntry: jest.fn(),
      remove: jest.fn(),
      countByOutfit: jest.fn(),
    };
    const fileService = {
      storeOriginalImageFromFileUpload: jest
        .fn()
        .mockResolvedValue({ fileName: 'look.webp' }),
      deleteById: jest.fn(),
    };
    const controller = new MiniappDailyOutfitController(
      garmentService as any,
      outfitService as any,
      calendarService as any,
      fileService as any,
    );
    const req = {
      protocol: 'https',
      host: 'aimatchwear.asia',
      file: jest.fn(),
    } as any;
    return {
      controller,
      garmentService,
      outfitService,
      calendarService,
      fileService,
      req,
    };
  };

  it('saves uploaded photo and selected garments as today outfit', async () => {
    const {
      controller,
      garmentService,
      outfitService,
      calendarService,
      fileService,
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
    const outfit = makeOutfit([shirt, pants]);
    const entry = makeEntry(outfit);

    garmentService.findAll.mockResolvedValue([shirt, pants]);
    outfitService.create.mockResolvedValue(outfit);
    calendarService.create.mockResolvedValue(entry);
    req.file.mockResolvedValue(
      makeUpload({
        date: '2026-06-13',
        title: '休闲通勤',
        reason: '白 T 和牛仔裤适合日常上班。',
        scene: '通勤',
        rating: '5',
        feedback: '显精神',
        garmentIds: JSON.stringify([1, 2]),
      }),
    );

    await expect(controller.save({}, req)).resolves.toEqual({
      item: expect.objectContaining({
        id: 7,
        date: '2026-06-13',
        scene: '通勤',
        rating: 5,
        feedback: '显精神',
        outfit: expect.objectContaining({
          id: 18,
          name: '休闲通勤',
          photoUrl: 'https://aimatchwear.asia/file/look.webp',
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
        photoFileName: 'look.webp',
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
        scene: '通勤',
        rating: '5',
        feedback: '显精神',
      },
      undefined,
    );
    expect(fileService.storeOriginalImageFromFileUpload).toHaveBeenCalledWith(
      expect.objectContaining({ mimetype: 'image/jpeg' }),
      undefined,
    );
  });

  it('saves a photo-only daily outfit without garments', async () => {
    const { controller, garmentService, outfitService, calendarService, req } =
      makeController();
    const outfit = makeOutfit([], {
      name: '今天很满意',
      notes: '颜色很和谐',
    });
    const entry = makeEntry(outfit, {
      notes: '颜色很和谐',
      scene: '约会',
      rating: undefined,
      feedback: undefined,
    });

    garmentService.findAll.mockResolvedValue([]);
    outfitService.create.mockResolvedValue(outfit);
    calendarService.create.mockResolvedValue(entry);
    req.file.mockResolvedValue(
      makeUpload({
        date: '2026-06-13',
        title: '今天很满意',
        reason: '颜色很和谐',
        scene: '约会',
        garmentIds: JSON.stringify([]),
      }),
    );

    await expect(controller.save({}, req)).resolves.toEqual({
      item: expect.objectContaining({
        outfit: expect.objectContaining({
          photoUrl: 'https://aimatchwear.asia/file/look.webp',
          garments: [],
        }),
      }),
    });
    expect(outfitService.create).toHaveBeenCalledWith(
      {
        name: '今天很满意',
        notes: '颜色很和谐',
        photoFileName: 'look.webp',
        slots: [],
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
            photoUrl: 'https://aimatchwear.asia/file/look.webp',
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

  it('removes daily outfit and cleans unused outfit photo', async () => {
    const { controller, outfitService, calendarService, fileService, req } =
      makeController();
    const outfit = makeOutfit([makeGarment()], {
      photo: { id: 99, fileName: 'look.webp' } as any,
    });
    const entry = makeEntry(outfit);

    calendarService.findOwnedEntry.mockResolvedValue(entry);
    calendarService.countByOutfit.mockResolvedValue(0);

    await expect(controller.remove(7, req)).resolves.toEqual({ ok: true });
    expect(calendarService.findOwnedEntry).toHaveBeenCalledWith(7, undefined);
    expect(calendarService.remove).toHaveBeenCalledWith(7, undefined);
    expect(calendarService.countByOutfit).toHaveBeenCalledWith(18);
    expect(outfitService.remove).toHaveBeenCalledWith(18, undefined);
    expect(fileService.deleteById).toHaveBeenCalledWith(99, undefined);
  });

  it('removes only calendar entry when outfit is still referenced', async () => {
    const { controller, outfitService, calendarService, fileService, req } =
      makeController();
    const outfit = makeOutfit([makeGarment()], {
      photo: { id: 99, fileName: 'look.webp' } as any,
    });
    const entry = makeEntry(outfit);

    calendarService.findOwnedEntry.mockResolvedValue(entry);
    calendarService.countByOutfit.mockResolvedValue(1);

    await expect(controller.remove(7, req)).resolves.toEqual({ ok: true });
    expect(calendarService.remove).toHaveBeenCalledWith(7, undefined);
    expect(calendarService.countByOutfit).toHaveBeenCalledWith(18);
    expect(outfitService.remove).not.toHaveBeenCalled();
    expect(fileService.deleteById).not.toHaveBeenCalled();
  });
});
