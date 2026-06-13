import { OutfitAiService } from './outfit-ai.service';

describe('OutfitAiService', () => {
  const garments = [
    {
      id: 1,
      name: '黑色西装外套',
      category: 'outerwear',
      color: 'black',
      seasons: ['春', '秋'],
      styleTags: ['法式'],
      sceneTags: ['通勤'],
      status: 'wearable',
    },
    {
      id: 2,
      name: '待洗半裙',
      category: 'bottoms',
      color: 'black',
      seasons: ['春'],
      styleTags: ['法式'],
      sceneTags: ['约会'],
      status: 'laundry',
    },
    {
      id: 3,
      name: '白色衬衫',
      category: 'tops',
      color: 'white',
      seasons: ['春', '秋'],
      styleTags: ['简约'],
      sceneTags: ['通勤'],
      status: 'wearable',
    },
  ];

  it('falls back to rule based recommendations when no API key is configured', async () => {
    const service = new OutfitAiService({
      get: jest.fn(() => undefined),
    } as any);

    const result = await service.recommend({
      requestText: '黑色通勤',
      availableGarments: garments,
    });

    expect(result.source).toBe('fallback');
    expect(result.message).toBe(
      'AI暂时不可用，先为你按衣橱标签筛选出这些单品。',
    );
    expect(result.recommendations).toEqual([
      expect.objectContaining({
        garmentIds: [1, 3],
      }),
    ]);
  });

  it('removes invented, missing, and non-wearable garment ids from AI output', async () => {
    const fetchImpl = jest.fn(async () => ({
      ok: true,
      json: async () => ({
        output_text: JSON.stringify({
          recommendations: [
            {
              title: 'AI通勤方案',
              garmentIds: [1, 2, 999],
              reason: '黑色外套适合通勤。',
              cautions: [],
            },
          ],
        }),
      }),
    }));
    const service = new OutfitAiService(
      {
        get: jest.fn((key: string) => {
          if (key === 'OPENAI_API_KEY') return 'test-key';
          if (key === 'AI_API_BASE_URL') return 'https://api.example.test/';
          if (key === 'AI_TEXT_MODEL') return 'gpt-4.1-mini';
          return undefined;
        }),
      } as any,
      fetchImpl as any,
    );

    const result = await service.recommend({
      requestText: '黑色通勤',
      availableGarments: garments,
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.example.test/v1/chat/completions',
      expect.any(Object),
    );
    expect(result.source).toBe('ai');
    expect(result.recommendations).toEqual([
      {
        title: 'AI通勤方案',
        garmentIds: [1],
        reason: '黑色外套适合通勤。',
        cautions: ['已移除不存在或不可穿的衣物。'],
      },
    ]);
  });
  it('parses chat completions JSON content', async () => {
    const fetchImpl = jest.fn(async () => ({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                recommendations: [
                  {
                    title: 'Plan A',
                    garmentIds: [3],
                    reason: 'Use the available shirt.',
                    cautions: [],
                  },
                ],
              }),
            },
          },
        ],
      }),
    }));
    const service = new OutfitAiService(
      {
        get: jest.fn((key: string) => {
          if (key === 'OPENAI_API_KEY') return 'test-key';
          if (key === 'AI_API_BASE_URL') return 'https://api.example.test/';
          if (key === 'AI_TEXT_MODEL') return 'gpt-5.3';
          return undefined;
        }),
      } as any,
      fetchImpl as any,
    );

    const result = await service.recommend({
      requestText: 'commute',
      availableGarments: garments,
    });

    const requestBody = JSON.parse(fetchImpl.mock.calls[0][1].body);
    expect(requestBody.messages).toEqual(expect.any(Array));
    expect(JSON.stringify(requestBody.messages)).toContain('json');
    expect(requestBody.model).toBe('gpt-5.3-chat-latest');
    expect(requestBody.response_format).toEqual({ type: 'json_object' });
    expect(requestBody.max_completion_tokens).toBe(900);
    expect(result).toEqual({
      source: 'ai',
      recommendations: [
        {
          title: 'Plan A',
          garmentIds: [3],
          reason: 'Use the available shirt.',
          cautions: [],
        },
      ],
    });
  });

  it('disables thinking output for Qwen JSON responses', async () => {
    const fetchImpl = jest.fn(async () => ({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                recommendations: [
                  {
                    title: 'Qwen Plan',
                    garmentIds: [1, 3],
                    reason: 'Use wearable garments.',
                    cautions: [],
                  },
                ],
              }),
            },
          },
        ],
      }),
    }));
    const service = new OutfitAiService(
      {
        get: jest.fn((key: string) => {
          if (key === 'QWEN_API_KEY') return 'test-qwen-key';
          if (key === 'QWEN_API_BASE_URL') {
            return 'https://dashscope.aliyuncs.com/compatible-mode';
          }
          if (key === 'QWEN_TEXT_MODEL') return 'qwen3.5-plus';
          return undefined;
        }),
      } as any,
      fetchImpl as any,
    );

    await service.recommend({
      requestText: 'commute',
      availableGarments: garments,
    });

    const requestBody = JSON.parse(fetchImpl.mock.calls[0][1].body);
    expect(requestBody.model).toBe('qwen3.5-plus');
    expect(requestBody.enable_thinking).toBe(false);
    expect(requestBody.response_format).toEqual({ type: 'json_object' });
  });
});
