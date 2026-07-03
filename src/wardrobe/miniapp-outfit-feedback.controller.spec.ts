import { BadRequestException } from '@nestjs/common';
import { MiniappOutfitFeedbackController } from './miniapp-outfit-feedback.controller';

describe('MiniappOutfitFeedbackController', () => {
  const makeController = () => {
    const outfitFeedbackService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findGarmentLookup: jest.fn(),
    };
    const controller = new MiniappOutfitFeedbackController(
      outfitFeedbackService as any,
    );
    const req = { user: { userId: 7 } } as any;
    return { controller, outfitFeedbackService, req };
  };

  const makeFeedback = (overrides: Record<string, unknown> = {}) => ({
    id: 1,
    createdAt: new Date('2026-07-02T08:00:00.000Z'),
    rating: 'good',
    comment: '很喜欢这套',
    requestText: '明天上班穿什么',
    planTitle: '清爽通勤',
    planReason: '白衬衫和牛仔裤适合日常通勤。',
    garmentIds: [1, 2],
    source: 'ai',
    coreGarmentId: 1,
    ...overrides,
  });

  it('saves feedback with the current miniapp user', async () => {
    const { controller, outfitFeedbackService, req } = makeController();
    outfitFeedbackService.create.mockResolvedValue(makeFeedback());

    await expect(
      controller.save(
        {
          rating: 'good',
          comment: ' 很喜欢这套 ',
          requestText: '明天上班穿什么',
          planTitle: '清爽通勤',
          planReason: '白衬衫和牛仔裤适合日常通勤。',
          garmentIds: [1, '2', 2],
          source: 'ai',
          coreGarmentId: '1',
        },
        req,
      ),
    ).resolves.toEqual({
      item: expect.objectContaining({
        id: 1,
        rating: 'good',
        ratingLabel: '搭配得不错',
        comment: '很喜欢这套',
        garmentIds: [1, 2],
        createdAt: '2026-07-02T08:00:00.000Z',
      }),
    });

    expect(outfitFeedbackService.create).toHaveBeenCalledWith(
      {
        rating: 'good',
        comment: '很喜欢这套',
        requestText: '明天上班穿什么',
        planTitle: '清爽通勤',
        planReason: '白衬衫和牛仔裤适合日常通勤。',
        garmentIds: [1, 2],
        source: 'ai',
        coreGarmentId: 1,
      },
      7,
    );
  });

  it('rejects an invalid rating option', async () => {
    const { controller, outfitFeedbackService, req } = makeController();

    await expect(
      controller.save({ rating: 'great', comment: '' }, req),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(outfitFeedbackService.create).not.toHaveBeenCalled();
  });

  it('rejects a comment over the length limit', async () => {
    const { controller, outfitFeedbackService, req } = makeController();

    await expect(
      controller.save({ rating: 'bad', comment: 'a'.repeat(501) }, req),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(outfitFeedbackService.create).not.toHaveBeenCalled();
  });

  it('exports feedback as an excel download', async () => {
    const { controller, outfitFeedbackService, req } = makeController();
    outfitFeedbackService.findAll.mockResolvedValue([makeFeedback()]);
    outfitFeedbackService.findGarmentLookup.mockResolvedValue(
      new Map([
        [
          1,
          {
            id: 1,
            name: '白衬衫',
            category: 'tops',
            color: 'white',
          },
        ],
        [
          2,
          {
            id: 2,
            name: '牛仔裤',
            category: 'bottoms',
            color: 'blue',
          },
        ],
      ]),
    );
    const reply = { header: jest.fn(), send: jest.fn() } as any;

    await controller.exportExcel(req, reply);

    expect(outfitFeedbackService.findAll).toHaveBeenCalledWith(7);
    expect(outfitFeedbackService.findGarmentLookup).toHaveBeenCalledWith(7, [
      1,
      2,
      1,
    ]);
    expect(reply.header).toHaveBeenCalledWith(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    expect(reply.header).toHaveBeenCalledWith(
      'Content-Disposition',
      expect.stringContaining('outfit-feedback-'),
    );
    expect(reply.send).toHaveBeenCalledTimes(1);
    const sent = reply.send.mock.calls[0][0];
    expect(Buffer.isBuffer(sent)).toBe(true);
    expect(sent.length).toBeGreaterThan(0);
  });

  it('exports feedback for the current miniapp user', async () => {
    const { controller, outfitFeedbackService, req } = makeController();
    outfitFeedbackService.findAll.mockResolvedValue([
      makeFeedback(),
      makeFeedback({ id: 2, rating: 'bad', comment: undefined }),
    ]);

    const result = await controller.export(req);

    expect(outfitFeedbackService.findAll).toHaveBeenCalledWith(7);
    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toEqual(
      expect.objectContaining({ id: 1, ratingLabel: '搭配得不错' }),
    );
    expect(result.items[1]).toEqual(
      expect.objectContaining({ id: 2, ratingLabel: '不喜欢', comment: '' }),
    );
  });
});
