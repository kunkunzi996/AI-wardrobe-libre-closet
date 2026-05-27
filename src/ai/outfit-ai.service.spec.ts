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
});
