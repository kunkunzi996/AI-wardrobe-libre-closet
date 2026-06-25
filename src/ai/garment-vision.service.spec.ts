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
      ...defaultStructuredDraft,
      confidence: 0,
      notes: 'AI 识别服务暂不可用，请手动确认衣物信息。',
    });
  });

  it('calls the configured Qwen vision endpoint with base64 image data', async () => {
    fileService.get.mockResolvedValue(
      Readable.from(Buffer.from('image-bytes')),
    );
    const fetchImpl = jest.fn(async () => ({
      ok: true,
      json: async () => ({
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
    }));
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
      subcategory: '西装外套',
      color: 'black',
      seasons: ['春秋'],
      styleTags: ['通勤'],
      sceneTags: ['上班'],
      material: '羊毛',
      thickness: '中等',
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
    const fetchImpl = jest.fn(async () => ({
      ok: true,
      json: async () => ({
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
    }));
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
      seasons: ['夏'],
      styleTags: ['通勤'],
      sceneTags: ['约会'],
      material: undefined,
      thickness: undefined,
      ...defaultStructuredDraft,
      confidence: 1,
      notes: 'AI 已生成草稿，请确认后再保存。',
    });
  });

  it('localizes common English AI labels before showing the draft', async () => {
    fileService.get.mockResolvedValue(
      Readable.from(Buffer.from('image-bytes')),
    );
    const fetchImpl = jest.fn(async () => ({
      ok: true,
      json: async () => ({
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
    }));
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
      subcategory: '阔腿裤',
      color: 'black',
      seasons: ['春', '秋', '冬'],
      styleTags: ['正式', '商务', '经典'],
      sceneTags: ['办公室', '通勤'],
      material: '羊毛混纺',
      thickness: '中等',
      ...defaultStructuredDraft,
      confidence: 0.9,
      notes: '黑色阔腿裤，适合正式商务场合，材质可能为羊毛混纺。',
    });
  });

  it('normalizes shoe category aliases to footwear', async () => {
    fileService.get.mockResolvedValue(
      Readable.from(Buffer.from('image-bytes')),
    );
    const fetchImpl = jest.fn(async () => ({
      ok: true,
      json: async () => ({
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
    }));
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
    expect(result.subcategory).toBe('white sneakers');
    expect(result.color).toBe('white');
    expect(result).toMatchObject(defaultStructuredDraft);
    expect(result.confidence).toBe(0.91);
  });

  it('splits and localizes comma-separated English labels from the AI', async () => {
    fileService.get.mockResolvedValue(
      Readable.from(Buffer.from('image-bytes')),
    );
    const fetchImpl = jest.fn(async () => ({
      ok: true,
      json: async () => ({
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
    }));
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
      seasons: ['秋', '冬'],
      styleTags: ['休闲', '保暖', '基础款'],
      sceneTags: ['日常', '户外'],
      material: '聚酯纤维',
      thickness: '偏厚',
      ...defaultStructuredDraft,
      notes: '浅米色羽绒服，适合秋冬季节保暖穿着',
    });
  });

  it('normalizes structured duplicate-check fields from the AI response', async () => {
    fileService.get.mockResolvedValue(
      Readable.from(Buffer.from('image-bytes')),
    );
    const fetchImpl = jest.fn(async () => ({
      ok: true,
      json: async () => ({
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
    }));
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

  it('uses qwen3.7-plus by default and disables thinking for Qwen vision requests', async () => {
    fileService.get.mockResolvedValue(
      Readable.from(Buffer.from('image-bytes')),
    );
    const fetchImpl = jest.fn(async () => ({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '{"category":"tops"}' } }],
      }),
    }));
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
