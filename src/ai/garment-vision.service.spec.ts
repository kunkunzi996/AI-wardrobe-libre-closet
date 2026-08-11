import { Readable } from 'node:stream';
import { GarmentVisionService } from './garment-vision.service';

describe('GarmentVisionService', () => {
  const fileService = {
    get: jest.fn(),
  };
  const defaultStructuredDraft = {
    pocketPresence: 'unknown',
    pocketPosition: 'unknown',
    chestMarkPresence: 'unknown',
    chestMarkType: 'unknown',
    chestMarkPosition: 'unknown',
    chestMarkText: null,
  };
  const mockJsonResponse = (payload: unknown) =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve(payload),
    });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns a safe editable draft when real AI is not configured', async () => {
    const service = new GarmentVisionService(
      {
        get: jest.fn(() => undefined),
      } as any,
      fileService as any,
    );

    const result = await service.analyzeImage('sample.webp');

    expect(fileService.get).not.toHaveBeenCalled();
    expect(result).toEqual({
      fileName: 'sample.webp',
      category: 'tops',
      subcategory: undefined,
      color: undefined,
      seasons: [],
      styleTags: [],
      sceneTags: [],
      material: undefined,
      thickness: undefined,
      fit: undefined,
      taxonomyTags: {},
      ...defaultStructuredDraft,
      confidence: 0,
      notes: 'AI 识别服务暂不可用，请手动确认衣物信息。',
    });
  });

  it('calls the configured Qwen vision endpoint with base64 image data', async () => {
    fileService.get.mockResolvedValue(
      Readable.from(Buffer.from('image-bytes')),
    );
    const fetchImpl = jest.fn(() =>
      mockJsonResponse({
        choices: [
          {
            message: {
              content: JSON.stringify({
                category: 'outerwear',
                subcategory: '西装外套',
                color: 'black',
                seasons: ['春秋'],
                styleTags: ['通勤'],
                sceneTags: ['上班'],
                material: '羊毛',
                thickness: '中等',
                pocketPresence: 'yes',
                pocketPosition: 'chest pocket',
                chestMarkPresence: 'yes',
                chestMarkType: 'label',
                chestMarkPosition: 'left chest',
                chestMarkText: 'Outdoor',
                confidence: 0.82,
                notes: '黑色通勤外套。',
              }),
            },
          },
        ],
      }),
    );
    const service = new GarmentVisionService(
      {
        get: jest.fn((key: string) => {
          if (key === 'QWEN_API_KEY') return 'test-qwen-key';
          if (key === 'QWEN_API_BASE_URL') return 'https://api.example.test/';
          if (key === 'QWEN_VISION_MODEL') return 'qwen3.7-plus';
          return undefined;
        }),
      } as any,
      fileService as any,
      fetchImpl as any,
    );

    const result = await service.analyzeImage('coat.webp');

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.example.test/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-qwen-key',
        }),
      }),
    );
    const request = JSON.parse(fetchImpl.mock.calls[0][1].body);
    expect(request.model).toBe('qwen3.7-plus');
    expect(request.enable_thinking).toBe(false);
    expect(request.messages[1].content[1].image_url.url).toContain(
      'data:image/webp;base64,',
    );
    expect(result).toEqual({
      fileName: 'coat.webp',
      category: 'outerwear',
      subcategory: '西装',
      color: 'black',
      seasons: ['spring', 'autumn'],
      styleTags: ['通勤'],
      sceneTags: ['通勤'],
      material: '羊毛',
      thickness: '适中',
      fit: undefined,
      taxonomyTags: {
        season: ['春季', '秋季'],
        thickness: ['适中'],
        color: ['黑色'],
        occasion: ['通勤'],
        style: ['通勤'],
        material: ['羊毛'],
        category: ['西装'],
      },
      pocketPresence: 'yes',
      pocketPosition: 'chest',
      chestMarkPresence: 'yes',
      chestMarkType: 'label',
      chestMarkPosition: 'chest-left',
      chestMarkText: 'Outdoor',
      confidence: 0.82,
      notes: '黑色通勤外套。',
    });
  });

  it('normalizes unsafe or incomplete AI fields before showing the draft', async () => {
    fileService.get.mockResolvedValue(
      Readable.from(Buffer.from('image-bytes')),
    );
    const fetchImpl = jest.fn(() =>
      mockJsonResponse({
        choices: [
          {
            message: {
              content: JSON.stringify({
                category: '',
                color: 'invisible',
                seasons: ['夏', 123],
                styleTags: '通勤',
                sceneTags: ['约会'],
                confidence: 3,
              }),
            },
          },
        ],
      }),
    );
    const service = new GarmentVisionService(
      {
        get: jest.fn((key: string) =>
          key === 'QWEN_API_KEY' ? 'test-qwen-key' : undefined,
        ),
      } as any,
      fileService as any,
      fetchImpl as any,
    );

    const result = await service.analyzeImage('shirt.png');

    expect(result).toEqual({
      fileName: 'shirt.png',
      category: 'tops',
      subcategory: undefined,
      color: undefined,
      seasons: ['summer'],
      styleTags: ['通勤'],
      sceneTags: ['约会', '通勤'],
      material: undefined,
      thickness: undefined,
      fit: undefined,
      taxonomyTags: {
        season: ['夏季'],
        occasion: ['约会', '通勤'],
        style: ['通勤'],
      },
      ...defaultStructuredDraft,
      confidence: 1,
      notes: 'AI 已生成草稿，请确认后再保存。',
    });
  });

  it('localizes common English AI labels before showing the draft', async () => {
    fileService.get.mockResolvedValue(
      Readable.from(Buffer.from('image-bytes')),
    );
    const fetchImpl = jest.fn(() =>
      mockJsonResponse({
        choices: [
          {
            message: {
              content: JSON.stringify({
                category: 'bottoms',
                subcategory: 'wide-leg pants',
                color: 'black',
                seasons: ['spring', 'autumn', 'winter'],
                styleTags: ['formal', 'business', 'classic'],
                sceneTags: ['office', 'commute'],
                material: 'wool blend',
                thickness: 'medium',
                confidence: 0.9,
                notes: 'Black wide-leg pants for formal business occasions.',
              }),
            },
          },
        ],
      }),
    );
    const service = new GarmentVisionService(
      {
        get: jest.fn((key: string) =>
          key === 'QWEN_API_KEY' ? 'test-qwen-key' : undefined,
        ),
      } as any,
      fileService as any,
      fetchImpl as any,
    );

    const result = await service.analyzeImage('pants.webp');

    expect(result).toEqual({
      fileName: 'pants.webp',
      category: 'bottoms',
      subcategory: '裤装',
      color: 'black',
      seasons: ['spring', 'autumn', 'winter'],
      styleTags: ['商务'],
      sceneTags: ['通勤', '商务'],
      material: '混纺',
      thickness: '适中',
      fit: undefined,
      taxonomyTags: {
        season: ['春季', '秋季', '冬季'],
        thickness: ['适中'],
        color: ['黑色'],
        occasion: ['通勤', '商务'],
        style: ['商务'],
        material: ['混纺'],
        category: ['裤装'],
      },
      ...defaultStructuredDraft,
      confidence: 0.9,
      notes: '黑色裤装，适合商务场合，材质可能为混纺。',
    });
  });

  it('normalizes shoe category aliases to footwear', async () => {
    fileService.get.mockResolvedValue(
      Readable.from(Buffer.from('image-bytes')),
    );
    const fetchImpl = jest.fn(() =>
      mockJsonResponse({
        choices: [
          {
            message: {
              content: JSON.stringify({
                category: 'sneakers',
                subcategory: 'white sneakers',
                color: 'white',
                seasons: ['summer'],
                styleTags: ['casual'],
                sceneTags: ['daily', 'weekend'],
                material: 'leather',
                thickness: 'medium',
                confidence: 0.91,
                notes: 'White sneakers with blue details.',
              }),
            },
          },
        ],
      }),
    );
    const service = new GarmentVisionService(
      {
        get: jest.fn((key: string) =>
          key === 'QWEN_API_KEY' ? 'test-qwen-key' : undefined,
        ),
      } as any,
      fileService as any,
      fetchImpl as any,
    );

    const result = await service.analyzeImage('shoes.webp');

    expect(result.fileName).toBe('shoes.webp');
    expect(result.category).toBe('footwear');
    expect(result.subcategory).toBe('鞋履');
    expect(result.color).toBe('white');
    expect(result).toMatchObject(defaultStructuredDraft);
    expect(result.confidence).toBe(0.91);
  });

  it('splits and localizes comma-separated English labels from the AI', async () => {
    fileService.get.mockResolvedValue(
      Readable.from(Buffer.from('image-bytes')),
    );
    const fetchImpl = jest.fn(() =>
      mockJsonResponse({
        choices: [
          {
            message: {
              content: JSON.stringify({
                category: 'outerwear',
                subcategory: 'puffer jacket',
                color: 'beige',
                seasons: ['autumn,winter'],
                styleTags: ['casual,warm,basic'],
                sceneTags: ['daily,outdoor'],
                material: 'polyester',
                thickness: 'thick',
                confidence: 0.88,
                notes: '浅米色羽绒服，适合秋冬季节保暖穿着',
              }),
            },
          },
        ],
      }),
    );
    const service = new GarmentVisionService(
      {
        get: jest.fn((key: string) =>
          key === 'QWEN_API_KEY' ? 'test-qwen-key' : undefined,
        ),
      } as any,
      fileService as any,
      fetchImpl as any,
    );

    const result = await service.analyzeImage('puffer.webp');

    expect(result).toMatchObject({
      fileName: 'puffer.webp',
      category: 'outerwear',
      subcategory: '羽绒服',
      color: 'beige',
      seasons: ['autumn', 'winter'],
      styleTags: ['休闲', '简约'],
      sceneTags: ['日常', '户外'],
      material: '涤纶',
      thickness: '厚款',
      ...defaultStructuredDraft,
      notes: '浅米色羽绒服，适合秋冬季节保暖穿着',
    });
  });

  it('normalizes structured duplicate-check fields from the AI response', async () => {
    fileService.get.mockResolvedValue(
      Readable.from(Buffer.from('image-bytes')),
    );
    const fetchImpl = jest.fn(() =>
      mockJsonResponse({
        choices: [
          {
            message: {
              content: JSON.stringify({
                category: 'tops',
                color: 'black',
                pocketPresence: '有',
                pocketPosition: '胸前',
                chestMarkPresence: 'yes',
                chestMarkType: 'letters',
                chestMarkPosition: 'left chest',
                chestMarkText: 'r',
                confidence: 0.73,
              }),
            },
          },
        ],
      }),
    );
    const service = new GarmentVisionService(
      {
        get: jest.fn((key: string) =>
          key === 'QWEN_API_KEY' ? 'test-qwen-key' : undefined,
        ),
      } as any,
      fileService as any,
      fetchImpl as any,
    );

    const result = await service.analyzeImage('tee.webp');

    expect(result).toMatchObject({
      fileName: 'tee.webp',
      category: 'tops',
      color: 'black',
      pocketPresence: 'yes',
      pocketPosition: 'chest',
      chestMarkPresence: 'yes',
      chestMarkType: 'text',
      chestMarkPosition: 'chest-left',
      chestMarkText: 'r',
      confidence: 0.73,
    });
  });

  it('normalizes boolean structured presence fields from the AI response', async () => {
    fileService.get.mockResolvedValue(
      Readable.from(Buffer.from('image-bytes')),
    );
    const fetchImpl = jest.fn(() =>
      mockJsonResponse({
        choices: [
          {
            message: {
              content: JSON.stringify({
                category: 'tops',
                color: 'black',
                pocketPresence: true,
                pocketPosition: 'chest pocket',
                chestMarkPresence: false,
                chestMarkType: 'letters',
                chestMarkPosition: 'left chest',
                chestMarkText: 'R',
                confidence: 0.77,
              }),
            },
          },
        ],
      }),
    );
    const service = new GarmentVisionService(
      {
        get: jest.fn((key: string) =>
          key === 'QWEN_API_KEY' ? 'test-qwen-key' : undefined,
        ),
      } as any,
      fileService as any,
      fetchImpl as any,
    );

    const result = await service.analyzeImage('bool-tee.webp');

    expect(result).toMatchObject({
      fileName: 'bool-tee.webp',
      category: 'tops',
      color: 'black',
      pocketPresence: 'yes',
      pocketPosition: 'chest',
      chestMarkPresence: 'no',
      chestMarkType: 'unknown',
      chestMarkPosition: 'unknown',
      chestMarkText: null,
      confidence: 0.77,
    });
  });

  it('uses qwen3.7-plus by default and disables thinking for Qwen vision requests', async () => {
    fileService.get.mockResolvedValue(
      Readable.from(Buffer.from('image-bytes')),
    );
    const fetchImpl = jest.fn(() =>
      mockJsonResponse({
        choices: [{ message: { content: '{"category":"tops"}' } }],
      }),
    );
    const service = new GarmentVisionService(
      {
        get: jest.fn((key: string) => {
          if (key === 'QWEN_API_KEY') return 'test-qwen-key';
          if (key === 'QWEN_API_BASE_URL') {
            return 'https://dashscope.aliyuncs.com/compatible-mode/';
          }
          return undefined;
        }),
      } as any,
      fileService as any,
      fetchImpl as any,
    );

    await service.analyzeImage('shirt.webp');

    const request = JSON.parse(fetchImpl.mock.calls[0][1].body);
    expect(request.model).toBe('qwen3.7-plus');
    expect(request.enable_thinking).toBe(false);
    const prompt = JSON.parse(request.messages[1].content[0].text);
    expect(prompt.allowedTaxonomy.color).toContain('黑色');
    expect(prompt.allowedTaxonomy).not.toHaveProperty('wearingFeel');
    expect(prompt.allowedTaxonomy.fit).toEqual([
      '直筒',
      '廓形',
      'A字',
      'H型',
      'X型',
      'O型',
      '茧型',
      '喇叭',
    ]);
    expect(prompt.allowedTaxonomy).not.toHaveProperty('feedback');
  });

  it('drops AI-created tags that are not in the approved taxonomy', () => {
    const service = new GarmentVisionService(
      { get: jest.fn(() => undefined) } as any,
      fileService as any,
    );

    const result = (service as any).normalizeResult('tagged.webp', {
      category: 'tops',
      taxonomyTags: {
        color: ['黑色', '透明色'],
        colorFeeling: ['暖色', '赛博朋克'],
        occasion: ['通勤', '外太空'],
        style: ['简约', '未来主义'],
        category: ['T恤'],
      },
      ...defaultStructuredDraft,
    });

    expect(result).toMatchObject({
      color: 'black',
      subcategory: 'T恤',
      styleTags: ['简约'],
      sceneTags: ['通勤'],
      taxonomyTags: {
        color: ['黑色'],
        colorFeeling: ['暖色'],
        occasion: ['通勤'],
        style: ['简约'],
        category: ['T恤'],
      },
    });
  });

  it('filters subjective AI taxonomy tags while preserving legal objective tags', () => {
    const service = new GarmentVisionService(
      { get: jest.fn(() => undefined) } as any,
      fileService as any,
    );

    const result = (service as any).normalizeResult('tagged.webp', {
      category: 'tops',
      color: 'black',
      taxonomyTags: {
        wearingFeel: ['舒适'],
        fit: ['宽松', 'A字'],
        color: ['黑色'],
      },
      ...defaultStructuredDraft,
    });

    expect(result).toMatchObject({
      color: 'black',
      fit: 'A字',
      taxonomyTags: {
        color: ['黑色'],
        fit: ['A字'],
      },
    });
    expect(result.taxonomyTags).not.toHaveProperty('wearingFeel');
  });

  it('returns an empty taxonomy when every AI tag is rejected and logs only bounded tag details', () => {
    const service = new GarmentVisionService(
      { get: jest.fn(() => undefined) } as any,
      fileService as any,
    );
    const warn = jest.spyOn((service as any).logger, 'warn');

    const result = (service as any).normalizeResult('tagged.webp', {
      category: 'tops',
      taxonomyTags: {
        wearingFeel: ['舒适', '亲肤'],
        fit: ['宽松', '紧身'],
      },
      ...defaultStructuredDraft,
    });

    expect(result.taxonomyTags).toEqual({});
    expect(result.fit).toBeUndefined();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('"group":"wearingFeel"'),
    );
    const warning = warn.mock.calls.at(-1)?.[0] as string;
    expect(warning).not.toContain('tagged.webp');
    expect(warning).not.toContain('base64');
  });

  it('falls back instead of hanging when the vision request times out', async () => {
    fileService.get.mockResolvedValue(
      Readable.from(Buffer.from('image-bytes')),
    );
    const fetchImpl = jest.fn(() => new Promise<Response>(() => undefined));
    const service = new GarmentVisionService(
      {
        get: jest.fn((key: string) => {
          if (key === 'QWEN_API_KEY') return 'test-qwen-key';
          if (key === 'AI_VISION_TIMEOUT_MS') return '5';
          return undefined;
        }),
      } as any,
      fileService as any,
      fetchImpl as any,
    );

    await expect(service.analyzeImage('slow.webp')).resolves.toMatchObject({
      fileName: 'slow.webp',
      category: 'tops',
      ...defaultStructuredDraft,
      confidence: 0,
      notes: 'AI 识别服务暂不可用，请手动确认衣物信息。',
    });
  }, 1000);
});
