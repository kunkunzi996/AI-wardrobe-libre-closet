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
  const mockJsonResponse = (payload: unknown) =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve(payload),
    });

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

  it('keeps the core garment first in fallback recommendations', async () => {
    const service = new OutfitAiService({
      get: jest.fn(() => undefined),
    } as any);

    const result = await service.recommend({
      requestText: 'white shirt commute',
      coreGarmentId: 1,
      availableGarments: garments,
    });

    expect(result.source).toBe('fallback');
    expect(result.recommendations[0].garmentIds[0]).toBe(1);
  });

  it('removes invented, missing, and non-wearable garment ids from AI output', async () => {
    const fetchImpl = jest.fn(() =>
      mockJsonResponse({
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
    );
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
    const fetchImpl = jest.fn(() =>
      mockJsonResponse({
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
    );
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

  it('sends the required core garment to the AI request', async () => {
    const fetchImpl = jest.fn(() =>
      mockJsonResponse({
        choices: [
          {
            message: {
              content: JSON.stringify({
                recommendations: [
                  {
                    title: 'Core Plan',
                    garmentIds: [3],
                    reason: 'Use the requested shirt as the core.',
                    cautions: [],
                  },
                ],
              }),
            },
          },
        ],
      }),
    );
    const service = new OutfitAiService(
      {
        get: jest.fn((key: string) => {
          if (key === 'OPENAI_API_KEY') return 'test-key';
          if (key === 'AI_API_BASE_URL') return 'https://api.example.test/';
          return undefined;
        }),
      } as any,
      fetchImpl as any,
    );

    const result = await service.recommend({
      requestText: 'around this item',
      coreGarmentId: 1,
      availableGarments: garments,
    });

    const userMessage = JSON.parse(
      JSON.parse(fetchImpl.mock.calls[0][1].body).messages[1].content,
    );
    expect(userMessage.requiredCoreGarmentId).toBe(1);
    expect(userMessage.coreGarment).toEqual(expect.objectContaining({ id: 1 }));
    expect(userMessage.rules.join(' ')).toContain('Every recommendation');
    expect(result.recommendations[0].garmentIds[0]).toBe(1);
  });

  it('disables thinking output for Qwen JSON responses', async () => {
    const fetchImpl = jest.fn(() =>
      mockJsonResponse({
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
    );
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

  it('sends the mini-program mode, temperature context, and normalized tag profiles with equal-group rules', async () => {
    const fetchImpl = jest.fn(() =>
      mockJsonResponse({
        choices: [
          {
            message: {
              content: JSON.stringify({
                recommendations: [
                  {
                    title: '结构化通勤',
                    garmentIds: [1, 3],
                    reason: '结构化标签匹配通勤。',
                    cautions: [],
                  },
                ],
              }),
            },
          },
        ],
      }),
    );
    const service = new OutfitAiService(
      {
        get: jest.fn((key: string) => {
          if (key === 'OPENAI_API_KEY') return 'test-key';
          if (key === 'AI_API_BASE_URL') return 'https://api.example.test/';
          return undefined;
        }),
      } as any,
      fetchImpl as any,
    );

    await service.recommend({
      mode: 'miniapp-taxonomy-v1',
      requestText: '通勤',
      coreGarmentId: 1,
      temperatureContext: {
        status: 'available',
        city: '上海市',
        currentC: 22,
        hourly: [],
        minC: 18,
        maxC: 25.1,
      },
      availableGarments: [
        {
          ...garments[0],
          tagsByGroup: { style: ['通勤'], occasion: ['通勤'], color: ['黑色'] },
          sourceByGroup: {
            style: 'taxonomy',
            occasion: 'taxonomy',
            color: 'taxonomy',
          },
        },
        {
          ...garments[2],
          tagsByGroup: { style: ['简约'], occasion: ['通勤'] },
          sourceByGroup: { style: 'taxonomy', occasion: 'taxonomy' },
        },
      ],
    } as any);

    const requestBody = JSON.parse(fetchImpl.mock.calls[0][1].body);
    const userMessage = JSON.parse(requestBody.messages[1].content);
    expect(userMessage.mode).toBe('miniapp-taxonomy-v1');
    expect(userMessage.temperatureContext).toEqual(
      expect.objectContaining({ maxC: 25.1, minC: 18 }),
    );
    expect(userMessage.availableGarments[0]).toEqual(
      expect.objectContaining({
        tagsByGroup: expect.objectContaining({ style: ['通勤'] }),
        sourceByGroup: expect.objectContaining({ style: 'taxonomy' }),
      }),
    );
    expect(userMessage.rules.join(' ')).toMatch(/标签组|等权|一次/);
  });

  it('in mini-program mode keeps all inventory statuses, removes invalid ids, and deduplicates ids', async () => {
    const fetchImpl = jest.fn(() =>
      mockJsonResponse({
        output_text: JSON.stringify({
          recommendations: [
            {
              title: '库存状态方案',
              garmentIds: [1, 2, 999, 2],
              reason: '使用当前衣橱单品。',
              cautions: [],
            },
          ],
        }),
      }),
    );
    const service = new OutfitAiService(
      {
        get: jest.fn((key: string) => {
          if (key === 'OPENAI_API_KEY') return 'test-key';
          if (key === 'AI_API_BASE_URL') return 'https://api.example.test/';
          return undefined;
        }),
      } as any,
      fetchImpl as any,
    );

    const result = await service.recommend({
      mode: 'miniapp-taxonomy-v1',
      requestText: '日常',
      coreGarmentId: 1,
      availableGarments: [
        { ...garments[0], tagsByGroup: {}, sourceByGroup: {} },
        { ...garments[1], tagsByGroup: {}, sourceByGroup: {} },
        { id: 4, name: '收纳鞋', category: 'footwear', status: 'stored' },
      ],
    } as any);

    expect(result.source).toBe('ai');
    expect(result.recommendations[0].garmentIds).toEqual([1, 2]);
    expect(result.recommendations[0].garmentIds).not.toContain(999);
  });

  it('does not apply mini-program temperature or inventory-status business rules in the AI layer', async () => {
    const fetchImpl = jest.fn(() =>
      mockJsonResponse({
        output_text: JSON.stringify({
          recommendations: [
            {
              title: '模型方案',
              garmentIds: [1, 2],
              reason: '模型返回的组合。',
              cautions: [],
            },
          ],
        }),
      }),
    );
    const service = new OutfitAiService(
      {
        get: jest.fn((key: string) => {
          if (key === 'OPENAI_API_KEY') return 'test-key';
          if (key === 'AI_API_BASE_URL') return 'https://api.example.test/';
          return undefined;
        }),
      } as any,
      fetchImpl as any,
    );

    const result = await service.recommend({
      mode: 'miniapp-taxonomy-v1',
      requestText: '今天穿什么',
      coreGarmentId: 1,
      temperatureContext: {
        status: 'available',
        city: '上海市',
        currentC: 30,
        hourly: [],
        minC: 26,
        maxC: 30,
      },
      availableGarments: [
        {
          ...garments[0],
          tagsByGroup: {},
          sourceByGroup: {},
        },
        {
          ...garments[1],
          status: 'stored',
          tagsByGroup: { thickness: ['厚款'] },
          sourceByGroup: { thickness: 'taxonomy' },
        },
      ],
    } as any);

    expect(result.recommendations[0].garmentIds).toEqual([1, 2]);
    expect(result.recommendations[0].cautions).toEqual([]);
  });
});
