import { Garment } from '../dal/entity/garment.entity';
import { GarmentColor } from './garment-color.enum';
import { GarmentStatus } from './garment-status.enum';
import { MiniappWardrobeController } from './miniapp-wardrobe.controller';
import { Readable } from 'node:stream';

describe('MiniappWardrobeController', () => {
  const defaultStructuredFields = {
    pocketPresence: 'unknown',
    pocketPosition: 'unknown',
    chestMarkPresence: 'unknown',
    chestMarkType: 'unknown',
    chestMarkPosition: 'unknown',
    chestMarkText: null,
  };

  const makeController = () => {
    const garmentService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      findSimilarToDraft: jest.fn(async () => []),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };
    const garmentVisionService = {
      analyzeImage: jest.fn(),
      analyzeUpload: jest.fn(),
    };
    const fileService = {
      get: jest.fn(),
    };
    garmentVisionService.analyzeImage.mockResolvedValue({
      fileName: 'coat.webp',
      category: 'tops',
      seasons: [],
      styleTags: [],
      sceneTags: [],
      ...defaultStructuredFields,
      confidence: 0,
      notes: 'AI 识别服务暂不可用，请手动确认衣物信息。',
    });
    const controller = new MiniappWardrobeController(
      garmentService as any,
      garmentVisionService as any,
      fileService as any,
    );
    const req = { protocol: 'https', host: 'aimatchwear.asia' } as any;

    return {
      controller,
      garmentService,
      garmentVisionService,
      fileService,
      req,
    };
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
      ...defaultStructuredFields,
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

  it('passes authenticated miniapp user id into wardrobe queries', async () => {
    const { controller, garmentService, req } = makeController();
    req.user = { userId: 42 };
    garmentService.findAll.mockResolvedValue([makeGarment()]);

    await controller.index(req);

    expect(garmentService.findAll).toHaveBeenCalledWith(42, {});
  });

  it('exports wardrobe backup as a zip buffer', async () => {
    const { controller, garmentService, fileService, req } = makeController();
    garmentService.findAll.mockResolvedValue([makeGarment()]);
    fileService.get.mockResolvedValue(
      Readable.from(Buffer.from('photo-bytes')),
    );
    const reply = {
      header: jest.fn().mockReturnThis(),
      send: jest.fn((payload) => payload),
    };

    const zip = await controller.exportBackup(req, reply as any);

    expect(reply.header).toHaveBeenCalledWith(
      'Content-Type',
      'application/zip',
    );
    expect(reply.header).toHaveBeenCalledWith(
      'Content-Disposition',
      expect.stringContaining('wardrobe-backup-'),
    );
    expect(Buffer.isBuffer(zip)).toBe(true);
    expect(zip.subarray(0, 2).toString()).toBe('PK');
    expect(zip.toString('utf8')).toContain('manifest.json');
    expect(zip.toString('utf8')).toContain('photos/7-coat.webp');
  });

  it('imports wardrobe backup zip files', async () => {
    const { controller, garmentService, fileService, req } = makeController();
    garmentService.findAll.mockResolvedValue([makeGarment()]);
    garmentService.create.mockResolvedValue(makeGarment({ id: 18 }));
    fileService.get.mockResolvedValue(
      Readable.from(Buffer.from('photo-bytes')),
    );
    const reply = {
      header: jest.fn().mockReturnThis(),
      send: jest.fn((payload) => payload),
    };
    const zip = (await controller.exportBackup(req, reply as any)) as Buffer;
    req.file = jest.fn(async () => ({
      filename: 'wardrobe-backup.zip',
      mimetype: 'application/zip',
      file: Readable.from(zip),
    }));

    await expect(controller.importBackup(req)).resolves.toEqual({
      imported: 1,
      skipped: 0,
    });
    expect(garmentService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Black Coat',
        category: 'outerwear',
        color: GarmentColor.BLACK,
        seasons: ['winter'],
        brand: 'Sample',
        size: 'M',
        notes: 'Warm',
        photo: expect.objectContaining({
          filename: '7-coat.webp',
          mimetype: 'image/webp',
        }),
      }),
      undefined,
    );
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
    expect(garmentService.update).not.toHaveBeenCalled();
  });

  it('saves authenticated miniapp garments under the current user id', async () => {
    const { controller, garmentService, req } = makeController();
    req.user = { userId: 42 };
    const upload = { mimetype: 'image/jpeg' };
    req.file = jest.fn(async () => upload);
    garmentService.create.mockResolvedValue(makeGarment({ id: 9 }));

    await controller.create({ name: 'White Shirt', category: 'tops' }, req);

    expect(garmentService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'White Shirt',
        category: 'tops',
        photo: upload,
      }),
      42,
    );
  });

  it('returns an AI editable draft without saving a garment', async () => {
    const { controller, garmentService, garmentVisionService, req } =
      makeController();
    const upload = { mimetype: 'image/jpeg' };
    req.file = jest.fn(async () => upload);
    garmentVisionService.analyzeImage.mockResolvedValue({
      fileName: 'coat.webp',
      category: 'bottoms',
      subcategory: '牛仔裤',
      color: GarmentColor.BLUE,
      seasons: ['夏'],
      styleTags: ['休闲'],
      sceneTags: ['日常'],
      material: '牛仔',
      thickness: '中等',
      confidence: 0.86,
      notes: '蓝色牛仔裤，适合日常场合。',
    });
    garmentVisionService.analyzeUpload.mockResolvedValue({
      fileName: 'miniapp-upload.webp',
      category: 'bottoms',
      subcategory: '牛仔裤',
      color: GarmentColor.BLUE,
      seasons: ['夏'],
      styleTags: ['休闲'],
      sceneTags: ['日常'],
      material: '牛仔',
      thickness: '中等',
      ...defaultStructuredFields,
      confidence: 0.86,
      notes: '蓝色牛仔裤，适合日常场合。',
    });

    await expect(controller.analyze(req)).resolves.toEqual({
      draft: expect.objectContaining({
        category: 'bottoms',
        color: GarmentColor.BLUE,
        seasons: ['夏'],
        styleTags: ['休闲'],
        sceneTags: ['日常'],
        material: '牛仔',
      }),
      duplicateCandidates: [],
    });
    expect(garmentVisionService.analyzeUpload).toHaveBeenCalledWith(upload);
    expect(garmentService.create).not.toHaveBeenCalled();
    expect(garmentService.update).not.toHaveBeenCalled();
  });

  it('returns possible duplicate garments with the AI editable draft', async () => {
    const { controller, garmentService, garmentVisionService, req } =
      makeController();
    req.user = { userId: 42 };
    const upload = { mimetype: 'image/jpeg' };
    req.file = jest.fn(async () => upload);
    const draft = {
      fileName: 'miniapp-upload.webp',
      category: 'outerwear',
      subcategory: '西装外套',
      color: GarmentColor.BLACK,
      seasons: ['秋'],
      styleTags: ['通勤'],
      sceneTags: ['上班'],
      material: '羊毛',
      thickness: '中等',
      pocketPresence: 'no',
      pocketPosition: 'unknown',
      chestMarkPresence: 'yes',
      chestMarkType: 'text',
      chestMarkPosition: 'chest-left',
      chestMarkText: 'r',
      confidence: 0.88,
      notes: '黑色西装外套。',
    };
    garmentVisionService.analyzeUpload.mockResolvedValue(draft);
    garmentService.findSimilarToDraft.mockResolvedValue([
      {
        garment: makeGarment({
          id: 21,
          name: '黑色西装外套',
          category: 'outerwear',
          color: GarmentColor.BLACK,
          subcategory: '西装外套',
          photo: { fileName: 'black-blazer.webp' } as any,
        }),
        score: 90,
        reasons: ['分类相同', '颜色相同', '细分相同'],
      },
    ]);

    await expect(controller.analyze(req)).resolves.toEqual({
      draft,
      duplicateCandidates: [
        expect.objectContaining({
          id: 21,
          name: '黑色西装外套',
          categoryLabel: '外套',
          colorLabel: '黑色',
          matchScore: 90,
          matchReason: '分类相同、颜色相同、细分相同',
          photoUrl: 'https://aimatchwear.asia/file/black-blazer.webp',
        }),
      ],
    });
    expect(garmentService.findSimilarToDraft).toHaveBeenCalledWith(draft, 42);
  });

  it('saves user-confirmed AI draft fields from miniapp upload data', async () => {
    const { controller, garmentService, req } = makeController();
    const upload = { mimetype: 'image/jpeg' };
    req.file = jest.fn(async () => upload);
    garmentService.create.mockResolvedValue(
      makeGarment({
        id: 12,
        category: 'bottoms',
        color: GarmentColor.BLUE,
        seasons: ['夏'],
        styleTags: ['休闲'],
        sceneTags: ['日常'],
        material: '牛仔',
        thickness: '中等',
        pocketPresence: 'no',
        pocketPosition: 'unknown',
        chestMarkPresence: 'yes',
        chestMarkType: 'text',
        chestMarkPosition: 'chest-left',
        chestMarkText: 'R',
      } as Partial<Garment>),
    );

    await expect(
      controller.create(
        {
          name: '牛仔裤',
          category: 'bottoms',
          color: GarmentColor.BLUE,
          season: '夏',
          subcategory: '牛仔裤',
          styleTags: '休闲',
          sceneTags: '日常',
          material: '牛仔',
          thickness: '中等',
          pocketPresence: 'no',
          pocketPosition: 'unknown',
          chestMarkPresence: 'yes',
          chestMarkType: 'text',
          chestMarkPosition: 'chest-left',
          chestMarkText: 'R',
          notes: '用户确认后的备注',
        },
        req,
      ),
    ).resolves.toEqual({
      item: expect.objectContaining({
        id: 12,
        category: 'bottoms',
        color: GarmentColor.BLUE,
        season: '夏',
        styleTags: ['休闲'],
        sceneTags: ['日常'],
        material: '牛仔',
        thickness: '中等',
        pocketPresence: 'no',
        pocketPosition: 'unknown',
        chestMarkPresence: 'yes',
        chestMarkType: 'text',
        chestMarkPosition: 'chest-left',
        chestMarkText: 'R',
      }),
    });
    expect(garmentService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: '牛仔裤',
        category: 'bottoms',
        color: GarmentColor.BLUE,
        seasons: '夏',
        subcategory: '牛仔裤',
        styleTags: '休闲',
        sceneTags: '日常',
        material: '牛仔',
        thickness: '中等',
        pocketPresence: 'no',
        pocketPosition: 'unknown',
        chestMarkPresence: 'yes',
        chestMarkType: 'text',
        chestMarkPosition: 'chest-left',
        chestMarkText: 'R',
        notes: '用户确认后的备注',
        photo: upload,
      }),
      undefined,
    );
    expect(garmentService.update).not.toHaveBeenCalled();
  });

  it('updates miniapp garment text fields without changing photo', async () => {
    const { controller, garmentService, req } = makeController();
    garmentService.update.mockResolvedValue(
      makeGarment({
        id: 7,
        name: '白色衬衫',
        category: 'tops',
        color: GarmentColor.WHITE,
        seasons: ['spring'],
        styleTags: ['通勤'],
        sceneTags: ['上班'],
        material: '棉',
        thickness: '薄款',
        notes: '编辑后的备注',
      } as Partial<Garment>),
    );

    await expect(
      controller.update(
        7,
        {
          name: '白色衬衫',
          category: 'tops',
          color: GarmentColor.WHITE,
          season: 'spring',
          styleTags: '通勤',
          sceneTags: '上班',
          material: '棉',
          thickness: '薄款',
          notes: '编辑后的备注',
        },
        req,
      ),
    ).resolves.toEqual({
      item: expect.objectContaining({
        id: 7,
        name: '白色衬衫',
        category: 'tops',
        color: GarmentColor.WHITE,
        season: 'spring',
        styleTags: ['通勤'],
        sceneTags: ['上班'],
        material: '棉',
        thickness: '薄款',
        photoUrl: 'https://aimatchwear.asia/file/coat.webp',
      }),
    });
    expect(garmentService.update).toHaveBeenCalledWith(
      7,
      expect.objectContaining({
        name: '白色衬衫',
        category: 'tops',
        color: GarmentColor.WHITE,
        seasons: 'spring',
        styleTags: '通勤',
        sceneTags: '上班',
        material: '棉',
        thickness: '薄款',
        notes: '编辑后的备注',
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

  it('reads miniapp form data when Fastify does not provide a body object', async () => {
    const { controller, garmentService, req } = makeController();
    const upload = {
      mimetype: 'image/jpeg',
      fields: {
        name: { value: 'Blue Pants' },
        category: { value: 'bottoms' },
        color: { value: GarmentColor.BLUE },
        season: { value: 'summer' },
      },
    };
    req.file = jest.fn(async () => upload);
    garmentService.create.mockResolvedValue(makeGarment({ id: 11 }));

    await expect(controller.create(undefined as any, req)).resolves.toEqual({
      item: expect.objectContaining({ id: 11 }),
    });
    expect(garmentService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Blue Pants',
        category: 'bottoms',
        color: GarmentColor.BLUE,
        seasons: 'summer',
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
