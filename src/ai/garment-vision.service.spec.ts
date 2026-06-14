import { Readable } from 'node:stream';
import { GarmentVisionService } from './garment-vision.service';

describe('GarmentVisionService', () => {
  const fileService = {
    get: jest.fn(),
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
      confidence: 0,
      notes: 'AI 识别服务暂不可用，请手动确认衣物信息。',
    });
  });

  it('calls the configured OpenAI-compatible vision endpoint with base64 image data', async () => {
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
          if (key === 'OPENAI_API_KEY') return 'test-key';
          if (key === 'AI_API_BASE_URL') return 'https://api.example.test/';
          if (key === 'AI_VISION_MODEL') return 'gpt-image-2';
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
          Authorization: 'Bearer test-key',
        }),
      }),
    );
    const request = JSON.parse(fetchImpl.mock.calls[0][1].body);
    expect(request.model).toBe('gpt-image-2');
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
          key === 'OPENAI_API_KEY' ? 'test-key' : undefined,
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
          key === 'OPENAI_API_KEY' ? 'test-key' : undefined,
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
      confidence: 0.9,
      notes: '黑色阔腿裤，适合正式商务场合，材质可能为羊毛混纺。',
    });
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
          key === 'OPENAI_API_KEY' ? 'test-key' : undefined,
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
      notes: '浅米色羽绒服，适合秋冬季节保暖穿着',
    });
  });

  it('disables thinking for Qwen vision requests', async () => {
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
          if (key === 'QWEN_VISION_MODEL') return 'qwen3.5-plus';
          return undefined;
        }),
      } as any,
      fileService as any,
      fetchImpl as any,
    );

    await service.analyzeImage('shirt.webp');

    const request = JSON.parse(fetchImpl.mock.calls[0][1].body);
    expect(request.model).toBe('qwen3.5-plus');
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
          if (key === 'OPENAI_API_KEY') return 'test-key';
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
      confidence: 0,
      notes: 'AI 识别服务暂不可用，请手动确认衣物信息。',
    });
  }, 1000);
});
