import {
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';

const COUNTS = {
  sourceGarmentCount: 1,
  sourcePhotoCount: 1,
  sourceOutfitCount: 1,
  sourceCalendarCount: 1,
  sourceFeedbackCount: 1,
};

function loadCopyService(): (new (...args: any[]) => any) | undefined {
  try {
    return require('./wardrobe-copy.service').WardrobeCopyService;
  } catch {
    return undefined;
  }
}

function spliceOwned(
  items: Array<{ id: number; owner?: { id?: number } }>,
  id: number,
  userId?: number,
) {
  const index = items.findIndex(
    (item) => item.id === id && item.owner?.id === userId,
  );
  if (index >= 0) items.splice(index, 1);
}

function spliceAllOwned(
  items: Array<{ owner?: { id?: number } }>,
  userId?: number,
) {
  for (let index = items.length - 1; index >= 0; index -= 1) {
    if (items[index].owner?.id === userId) items.splice(index, 1);
  }
}

function makeService(
  CopyService: new (...args: any[]) => any,
  extras: {
    targetGarments?: any[];
    targetOutfits?: any[];
    targetCalendars?: any[];
    targetFeedback?: any[];
  } = {},
) {
  const sourceGarment = {
    id: 10,
    name: '白T',
    category: 'tops',
    taxonomyTags: { color: ['白色'] },
    photo: { fileName: 'src.webp' },
    owner: { id: 1 },
  };
  const sourceOutfit = {
    id: 20,
    name: '日常',
    slots: [{ category: 'tops', garmentId: 10 }],
    photo: { fileName: 'look.webp' },
    owner: { id: 1 },
  };
  const sourceCalendar = {
    id: 30,
    date: new Date('2026-08-01T00:00:00.000Z'),
    outfit: { id: 20 },
    rating: 5,
    owner: { id: 1 },
  };
  const sourceFeedback = {
    id: 40,
    rating: 'good',
    garmentIds: [10],
    coreGarmentId: 10,
    owner: { id: 1 },
  };
  const users = [
    { id: 1, nickname: '老婆', acceptanceSandbox: false },
    { id: 2, nickname: '路人', acceptanceSandbox: false },
    { id: 3, nickname: '沙盒', acceptanceSandbox: true },
  ];
  const garments = [sourceGarment, ...(extras.targetGarments ?? [])];
  const outfits = [sourceOutfit, ...(extras.targetOutfits ?? [])];
  const calendars = [sourceCalendar, ...(extras.targetCalendars ?? [])];
  const feedback = [sourceFeedback, ...(extras.targetFeedback ?? [])];

  const owned = (items: Array<{ owner?: { id?: number } }>, userId?: number) =>
    items.filter((item) => item.owner?.id === userId);

  let nextId = 1000;
  const createdGarments: any[] = [];
  const createdOutfits: any[] = [];
  const createdCalendars: any[] = [];
  const createdFeedback: any[] = [];

  const adminService = {
    isAdmin: jest.fn(async (userId?: number) => userId === 7),
  };
  const fileService = {
    copyStoredFile: jest.fn(async (fileName: string, userId: number) => ({
      fileName: `copy-${fileName}`,
      createdBy: userId,
    })),
    storeImageFromFileUpload: jest.fn(),
  };
  const garmentService = {
    findAll: jest.fn(async (userId?: number) => owned(garments, userId)),
    create: jest.fn(async (dto: any, userId?: number) => {
      const created = {
        id: nextId++,
        owner: { id: userId },
        name: dto.name,
        category: dto.category,
        taxonomyTags: dto.taxonomyTags,
        photo: dto.photoFileName
          ? { fileName: dto.photoFileName }
          : undefined,
      };
      createdGarments.push(created);
      garments.push(created);
      return created;
    }),
    remove: jest.fn(async (id: number, userId?: number) => {
      spliceOwned(garments, id, userId);
    }),
  };
  const outfitService = {
    create: jest.fn(async (dto: any, userId?: number) => {
      const created = {
        id: nextId++,
        owner: { id: userId },
        name: dto.name,
        slots: dto.slots,
      };
      createdOutfits.push(created);
      outfits.push(created);
      return created;
    }),
    remove: jest.fn(async (id: number, userId?: number) => {
      spliceOwned(outfits, id, userId);
    }),
  };
  const calendarService = {
    create: jest.fn(async (dto: any, userId?: number) => {
      const created = {
        id: nextId++,
        owner: { id: userId },
        date: dto.date,
        outfitId: dto.outfitId,
      };
      createdCalendars.push(created);
      calendars.push(created);
      return created;
    }),
    remove: jest.fn(async (id: number, userId?: number) => {
      spliceOwned(calendars, id, userId);
    }),
  };
  const feedbackService = {
    create: jest.fn(async (dto: any, userId?: number) => {
      const created = {
        id: nextId++,
        owner: { id: userId },
        rating: dto.rating,
        garmentIds: dto.garmentIds,
        coreGarmentId: dto.coreGarmentId,
      };
      createdFeedback.push(created);
      feedback.push(created);
      return created;
    }),
    remove: jest.fn(async (id: number, userId?: number) => {
      spliceOwned(feedback, id, userId);
    }),
  };
  const userRepository = {
    findOne: jest.fn(async (id: number) =>
      users.find((user) => user.id === id),
    ),
  };
  const garmentRepository = {
    find: jest.fn(async (where: { owner?: { id?: number } }) =>
      owned(garments, where?.owner?.id),
    ),
    nativeDelete: jest.fn(async (where: { owner?: { id?: number } }) => {
      spliceAllOwned(garments, where?.owner?.id);
    }),
  };
  const outfitRepository = {
    find: jest.fn(async (where: { owner?: { id?: number } }) =>
      owned(outfits, where?.owner?.id),
    ),
    nativeDelete: jest.fn(async (where: { owner?: { id?: number } }) => {
      spliceAllOwned(outfits, where?.owner?.id);
    }),
  };
  const calendarRepository = {
    find: jest.fn(async (where: { owner?: { id?: number } }) =>
      owned(calendars, where?.owner?.id),
    ),
    nativeDelete: jest.fn(async (where: { owner?: { id?: number } }) => {
      spliceAllOwned(calendars, where?.owner?.id);
    }),
  };
  const feedbackRepository = {
    find: jest.fn(async (where: { owner?: { id?: number } }) =>
      owned(feedback, where?.owner?.id),
    ),
    nativeDelete: jest.fn(async (where: { owner?: { id?: number } }) => {
      spliceAllOwned(feedback, where?.owner?.id);
    }),
  };

  const service = new CopyService(
    adminService,
    garmentService,
    outfitService,
    calendarService,
    feedbackService,
    fileService,
    userRepository,
    garmentRepository,
    outfitRepository,
    calendarRepository,
    feedbackRepository,
  );

  return {
    service,
    fileService,
    garmentService,
    outfitService,
    calendarService,
    feedbackService,
    sourceGarment,
    sourceOutfit,
    createdGarments,
    createdOutfits,
    createdCalendars,
    createdFeedback,
    garments,
    outfits,
  };
}

describe('wardrobe copy', () => {
  it('copies a full wardrobe onto an empty sandbox and leaves the source unchanged', async () => {
    const CopyService = loadCopyService();
    expect(typeof CopyService).toBe('function');
    const ctx = makeService(CopyService!);

    const preview = await ctx.service.preview(7, 1, 3);
    expect(preview).toMatchObject({
      source: {
        id: 1,
        displayName: '老婆',
        garmentCount: 1,
        photoCount: 1,
        outfitCount: 1,
        calendarCount: 1,
        feedbackCount: 1,
      },
      target: {
        id: 3,
        displayName: '沙盒',
        acceptanceSandbox: true,
        garmentCount: 0,
      },
    });

    const result = await ctx.service.copy(7, {
      sourceUserId: 1,
      targetUserId: 3,
      ...COUNTS,
    });
    expect(result).toMatchObject({
      complete: true,
      copied: {
        garments: 1,
        photos: 1,
        outfits: 1,
        calendars: 1,
        feedback: 1,
      },
      matched: {
        outfitSlots: 1,
        outfitSlotsMapped: 1,
        calendars: 1,
        calendarsMapped: 1,
        feedbackGarmentIds: 2,
        feedbackGarmentIdsMapped: 2,
      },
    });

    expect(ctx.fileService.copyStoredFile).toHaveBeenCalledWith('src.webp', 3);
    expect(ctx.fileService.copyStoredFile).toHaveBeenCalledWith('look.webp', 3);
    expect(ctx.fileService.storeImageFromFileUpload).not.toHaveBeenCalled();
    expect(ctx.sourceGarment).toEqual({
      id: 10,
      name: '白T',
      category: 'tops',
      taxonomyTags: { color: ['白色'] },
      photo: { fileName: 'src.webp' },
      owner: { id: 1 },
    });
    expect(ctx.sourceOutfit.slots[0].garmentId).toBe(10);

    const copiedGarment = ctx.createdGarments[0];
    expect(copiedGarment.id).not.toBe(10);
    expect(copiedGarment.owner.id).toBe(3);
    expect(copiedGarment.taxonomyTags).toEqual({ color: ['白色'] });
    expect(copiedGarment.photo.fileName).toBe('copy-src.webp');
    expect(ctx.garmentService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: '白T',
        category: 'tops',
        taxonomyTags: { color: ['白色'] },
        photoFileName: 'copy-src.webp',
      }),
      3,
    );

    const copiedOutfit = ctx.createdOutfits[0];
    expect(copiedOutfit.slots[0].garmentId).toBe(copiedGarment.id);
    expect(ctx.outfitService.create).toHaveBeenCalledWith(
      expect.objectContaining({ photoFileName: 'copy-look.webp' }),
      3,
    );
    expect(ctx.createdCalendars[0].outfitId).toBe(copiedOutfit.id);
    expect(ctx.createdFeedback[0]).toMatchObject({
      garmentIds: [copiedGarment.id],
      coreGarmentId: copiedGarment.id,
    });
  });

  it('rejects an unmarked target, the same source and target, and mismatched counts', async () => {
    const CopyService = loadCopyService();
    expect(typeof CopyService).toBe('function');
    const { service } = makeService(CopyService!);

    await expect(
      service.copy(7, {
        sourceUserId: 1,
        targetUserId: 2,
        ...COUNTS,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.copy(7, {
        sourceUserId: 3,
        targetUserId: 3,
        ...COUNTS,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.copy(7, {
        sourceUserId: 1,
        targetUserId: 3,
        ...COUNTS,
        sourceGarmentCount: 99,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.preview(12, 1, 3)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('rejects a wardrobe copy when garment ids cannot be remapped onto the sandbox', async () => {
    const CopyService = loadCopyService();
    expect(typeof CopyService).toBe('function');
    const broken = makeService(CopyService!);
    broken.sourceOutfit.slots[0].garmentId = 999;
    await expect(
      broken.service.copy(7, {
        sourceUserId: 1,
        targetUserId: 3,
        ...COUNTS,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(broken.garmentService.create).toHaveBeenCalled();
    expect(broken.outfitService.create).not.toHaveBeenCalled();
  });
});

describe('overwrite sandbox', () => {
  const staleTarget = {
    garments: [
      {
        id: 99,
        name: '旧副本',
        category: 'bottoms',
        owner: { id: 3 },
      },
    ],
    outfits: [{ id: 88, name: '旧搭配', slots: [], owner: { id: 3 } }],
    calendars: [
      {
        id: 77,
        date: new Date('2026-07-01T00:00:00.000Z'),
        outfit: { id: 88 },
        owner: { id: 3 },
      },
    ],
    feedback: [
      { id: 66, rating: 'soso', garmentIds: [99], owner: { id: 3 } },
    ],
  };

  it('rejects replacing existing data without confirm', async () => {
    const CopyService = loadCopyService();
    expect(typeof CopyService).toBe('function');
    const ctx = makeService(CopyService!, {
      targetGarments: staleTarget.garments,
      targetOutfits: staleTarget.outfits,
      targetCalendars: staleTarget.calendars,
      targetFeedback: staleTarget.feedback,
    });

    await expect(
      ctx.service.copy(7, {
        sourceUserId: 1,
        targetUserId: 3,
        ...COUNTS,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(ctx.garmentService.create).not.toHaveBeenCalled();
    expect(ctx.garments.map((item) => item.id)).toContain(99);
    expect(ctx.outfits.map((item) => item.id)).toContain(88);
  });

  it('replaces existing sandbox data after confirm', async () => {
    const CopyService = loadCopyService();
    expect(typeof CopyService).toBe('function');
    const ctx = makeService(CopyService!, {
      targetGarments: staleTarget.garments,
      targetOutfits: staleTarget.outfits,
      targetCalendars: staleTarget.calendars,
      targetFeedback: staleTarget.feedback,
    });

    const result = await ctx.service.copy(7, {
      sourceUserId: 1,
      targetUserId: 3,
      ...COUNTS,
      overwrite: true,
    });
    expect(result).toMatchObject({
      complete: true,
      copied: {
        garments: 1,
        photos: 1,
        outfits: 1,
        calendars: 1,
        feedback: 1,
      },
    });

    const targetGarmentIds = ctx.garments
      .filter((item) => item.owner?.id === 3)
      .map((item) => item.id);
    expect(targetGarmentIds).not.toContain(99);
    expect(targetGarmentIds).toHaveLength(1);
    expect(ctx.outfits.filter((item) => item.owner?.id === 3).map((item) => item.id)).not.toContain(
      88,
    );
    expect(ctx.sourceGarment.id).toBe(10);
    expect(ctx.sourceOutfit.slots[0].garmentId).toBe(10);
    expect(ctx.createdOutfits[0].slots[0].garmentId).toBe(targetGarmentIds[0]);
  });
});
