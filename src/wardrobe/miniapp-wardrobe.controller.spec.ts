import { Garment } from '../dal/entity/garment.entity';
import { GarmentColor } from './garment-color.enum';
import { GarmentStatus } from './garment-status.enum';
import { MiniappWardrobeController } from './miniapp-wardrobe.controller';

describe('MiniappWardrobeController', () => {
  const makeController = () => {
    const garmentService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      remove: jest.fn(),
    };
    const controller = new MiniappWardrobeController(garmentService as any);
    const req = { protocol: 'https', host: 'aimatchwear.asia' } as any;

    return { controller, garmentService, req };
  };

  const makeGarment = (overrides: Partial<Garment> = {}) =>
    Object.assign(new Garment(), {
      id: 7,
      name: 'Black Coat',
      category: 'outerwear',
      color: GarmentColor.BLACK,
      status: GarmentStatus.Wearable,
      seasons: ['winter'],
      brand: 'Sample',
      size: 'M',
      notes: 'Warm',
      photo: { fileName: 'coat.webp' },
      ...overrides,
    });

  it('returns garment list as miniapp JSON view models', async () => {
    const { controller, garmentService, req } = makeController();
    garmentService.findAll.mockResolvedValue([makeGarment()]);

    await expect(controller.index(req)).resolves.toEqual({
      items: [
        expect.objectContaining({
          id: 7,
          name: 'Black Coat',
          category: 'outerwear',
          categoryLabel: '外套',
          color: GarmentColor.BLACK,
          colorLabel: '黑色',
          status: GarmentStatus.Wearable,
          statusLabel: '可穿',
          season: 'winter',
          brand: 'Sample',
          size: 'M',
          photoUrl: 'https://aimatchwear.asia/file/coat.webp',
          detailUrl: '/api/miniapp/garments/7',
        }),
      ],
    });
    expect(garmentService.findAll).toHaveBeenCalledWith(undefined, {});
  });

  it('creates a garment from miniapp multipart upload data', async () => {
    const { controller, garmentService, req } = makeController();
    const upload = { mimetype: 'image/jpeg' };
    req.file = jest.fn(async () => upload);
    garmentService.create.mockResolvedValue(makeGarment({ id: 9 }));

    await expect(
      controller.create(
        {
          name: 'White Shirt',
          category: 'tops',
          color: GarmentColor.WHITE,
          season: 'spring',
          brand: 'Sample',
          size: 'S',
          notes: 'Office',
        },
        req,
      ),
    ).resolves.toEqual({
      item: expect.objectContaining({
        id: 9,
        photoUrl: 'https://aimatchwear.asia/file/coat.webp',
      }),
    });
    expect(garmentService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'White Shirt',
        category: 'tops',
        color: GarmentColor.WHITE,
        seasons: 'spring',
        brand: 'Sample',
        size: 'S',
        notes: 'Office',
        photo: upload,
      }),
      undefined,
    );
  });

  it('reads miniapp form data from multipart file fields when body is empty', async () => {
    const { controller, garmentService, req } = makeController();
    const upload = {
      mimetype: 'image/jpeg',
      fields: {
        name: { value: '白T' },
        category: { value: 'T袖' },
        color: { value: '白色' },
        season: { value: '夏天' },
        brand: { value: '' },
        size: { value: 'M' },
        notes: { value: '' },
      },
    };
    req.file = jest.fn(async () => upload);
    garmentService.create.mockResolvedValue(makeGarment({ id: 10 }));

    await expect(controller.create({}, req)).resolves.toEqual({
      item: expect.objectContaining({ id: 10 }),
    });
    expect(garmentService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: '白T',
        category: 'T袖',
        color: '白色',
        seasons: '夏天',
        brand: undefined,
        size: 'M',
        notes: undefined,
        photo: upload,
      }),
      undefined,
    );
  });

  it('rejects non-image uploads before creating a garment', async () => {
    const { controller, garmentService, req } = makeController();
    req.file = jest.fn(async () => ({ mimetype: 'text/plain' }));

    await expect(
      controller.create({ name: 'Bad file', category: 'tops' }, req),
    ).rejects.toThrow('上传文件必须是图片');
    expect(garmentService.create).not.toHaveBeenCalled();
  });

  it('deletes garments through the service', async () => {
    const { controller, garmentService, req } = makeController();

    await expect(controller.remove(7, req)).resolves.toEqual({ ok: true });
    expect(garmentService.remove).toHaveBeenCalledWith(7, undefined);
  });
});
