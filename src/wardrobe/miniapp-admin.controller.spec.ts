import { Readable } from 'node:stream';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import ExcelJS from 'exceljs';
import { MiniappAdminController } from './miniapp-admin.controller';

describe('MiniappAdminController', () => {
  const tinyPng = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=',
    'base64',
  );

  const makeController = () => {
    const adminService = {
      listUsers: jest.fn(),
      findUserGarments: jest.fn(),
      backfillUserGarmentTags: jest.fn(),
      setAcceptanceSandbox: jest.fn(),
    };
    const fileService = {
      get: jest.fn(() => Promise.resolve(Readable.from(tinyPng))),
    };
    const copyService = {
      preview: jest.fn(),
      copy: jest.fn(),
    };
    const controller = new MiniappAdminController(
      adminService as any,
      fileService as any,
      copyService as any,
    );
    const req = { user: { userId: 7 } } as any;
    return { controller, adminService, fileService, copyService, req };
  };

  // 只认字符串和数字单元格，其余一律读成空串：这样某列意外写进对象时断言会失败，
  // 而不是被 String() 悄悄糊成 '[object Object]'。
  const cellText = (value: unknown): string =>
    typeof value === 'string' || typeof value === 'number' ? String(value) : '';

  // 把导出的 xlsx 读回来，按表头名取值，避免断言依赖列的绝对位置。
  const readExportedRows = async (buffer: Buffer) => {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const sheet = workbook.worksheets[0];
    const headers = (sheet.getRow(1).values as unknown[])
      .slice(1)
      .map(cellText);

    const rows: Array<Record<string, string>> = [];
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const values = (row.values as unknown[]).slice(1);
      rows.push(
        Object.fromEntries(
          headers.map((header, index) => [header, cellText(values[index])]),
        ),
      );
    });
    return { headers, rows };
  };

  it('returns admin user summaries for the current admin', async () => {
    const { controller, adminService, req } = makeController();
    adminService.listUsers.mockResolvedValue([
      {
        id: 12,
        displayName: '昆昆子',
        nickname: '昆昆子',
        wechatOpenIdMasked: 'abcd...wxyz',
        garmentCount: 6,
      },
    ]);

    await expect(controller.users(req)).resolves.toEqual({
      items: [
        expect.objectContaining({
          id: 12,
          displayName: '昆昆子',
          garmentCount: 6,
        }),
      ],
    });
    expect(adminService.listUsers).toHaveBeenCalledWith(7);
  });

  it('exports selected user garments as an excel download', async () => {
    const { controller, adminService, fileService, req } = makeController();
    adminService.findUserGarments.mockResolvedValue([
      {
        id: 3,
        name: '黑色短袖',
        category: 'tops',
        color: 'black',
        status: 'wearable',
        photo: { fileName: 'shirt.webp' },
        seasons: ['夏'],
        styleTags: ['通勤'],
        sceneTags: ['日常'],
      },
    ]);
    const reply = { header: jest.fn(), send: jest.fn() } as any;

    await controller.exportUserGarments(12, req, reply);

    expect(adminService.findUserGarments).toHaveBeenCalledWith(7, 12);
    expect(fileService.get).toHaveBeenCalledWith('shirt.webp');
    expect(reply.header).toHaveBeenCalledWith(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    expect(reply.header).toHaveBeenCalledWith(
      'Content-Disposition',
      expect.stringContaining('user-12-garments-'),
    );
    expect(Buffer.isBuffer(reply.send.mock.calls[0][0])).toBe(true);
  });

  it('exports taxonomy tags, fit, and the backfill timestamp so backfilled garments are identifiable', async () => {
    const { controller, adminService, fileService, req } = makeController();
    fileService.get.mockResolvedValue(null);
    adminService.findUserGarments.mockResolvedValue([
      {
        id: 3,
        name: '已补标短袖',
        category: 'tops',
        color: 'black',
        status: 'wearable',
        fit: '宽松',
        // 组顺序故意打乱，且混入一个标签库外的值，用来验证输出按标签库定义排序并过滤越界值。
        taxonomyTags: {
          style: ['简约', '休闲', '库外风格'],
          season: ['夏季'],
          fit: ['宽松'],
        },
        tagsBackfilledAt: new Date('2026-08-06T08:41:28.000Z'),
      },
      {
        id: 4,
        name: '未补标短裤',
        category: 'bottoms',
        color: 'grey',
        status: 'wearable',
      },
      {
        id: 5,
        name: '深夜补标外套',
        category: 'outerwear',
        color: 'black',
        status: 'wearable',
        // 晚于 UTC 16:00 的时刻加 8 小时会跨到第二天，验证日期跟着进位。
        tagsBackfilledAt: new Date('2026-08-06T20:30:00.000Z'),
      },
    ]);
    const reply = { header: jest.fn(), send: jest.fn() } as any;

    await controller.exportUserGarments(12, req, reply);
    const { headers, rows } = await readExportedRows(
      reply.send.mock.calls[0][0],
    );

    expect(headers).toEqual(
      expect.arrayContaining(['版型', '结构化标签', 'AI补标时间(北京时间)']),
    );
    expect(headers).not.toContain('状态');
    expect(rows[0]).toMatchObject({
      版型: '宽松',
      结构化标签: '季节：夏季；风格：简约、休闲；版型：宽松',
      // 存的 08:41:28 UTC，导出应显示成北京时间 16:41:28
      'AI补标时间(北京时间)': '2026-08-06 16:41:28',
    });
    expect(rows[1]).toMatchObject({
      版型: '',
      结构化标签: '',
      'AI补标时间(北京时间)': '',
    });
    expect(rows[2]).toMatchObject({
      'AI补标时间(北京时间)': '2026-08-07 04:30:00',
    });
  });

  it('passes the current admin, target user, and requested limit to the service', async () => {
    const { controller, adminService, req } = makeController();
    adminService.backfillUserGarmentTags.mockResolvedValue({
      targetUserId: 12,
      effectiveLimit: 2,
    });

    await expect(
      controller.backfillUserGarmentTags(12, { limit: 2 }, req),
    ).resolves.toMatchObject({ targetUserId: 12, effectiveLimit: 2 });
    expect(adminService.backfillUserGarmentTags).toHaveBeenCalledWith(7, 12, 2);

    await controller.backfillUserGarmentTags(12, {}, req);
    expect(adminService.backfillUserGarmentTags).toHaveBeenLastCalledWith(
      7,
      12,
      3,
    );
  });

  it.each([0, -1, 1.5, 4, '1', [], {}, NaN, Infinity])(
    'rejects an invalid backfill limit: %p',
    async (limit) => {
      const { controller, adminService, req } = makeController();

      await expect(
        controller.backfillUserGarmentTags(12, { limit }, req),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(adminService.backfillUserGarmentTags).not.toHaveBeenCalled();
    },
  );

  it('keeps standard service authorization and concurrency errors intact', async () => {
    const { controller, adminService, req } = makeController();
    adminService.backfillUserGarmentTags.mockRejectedValueOnce(
      new ForbiddenException(),
    );
    await expect(
      controller.backfillUserGarmentTags(12, { limit: 1 }, req),
    ).rejects.toBeInstanceOf(ForbiddenException);

    adminService.backfillUserGarmentTags.mockRejectedValueOnce(
      new ConflictException(),
    );
    await expect(
      controller.backfillUserGarmentTags(12, { limit: 1 }, req),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  describe('acceptance sandbox', () => {
    it('forwards an enabled mark to the admin service', async () => {
      const { controller, adminService, req } = makeController();
      adminService.setAcceptanceSandbox.mockResolvedValue({
        id: 3,
        acceptanceSandbox: true,
      });

      const mark = (
        controller as {
          setAcceptanceSandbox?: (
            id: number,
            body: { enabled: boolean },
            req: unknown,
          ) => Promise<unknown>;
        }
      ).setAcceptanceSandbox;
      expect(typeof mark).toBe('function');
      await expect(mark!(3, { enabled: true }, req)).resolves.toEqual({
        item: { id: 3, acceptanceSandbox: true },
      });
      expect(adminService.setAcceptanceSandbox).toHaveBeenCalledWith(7, 3, true);
    });

    it('returns sandbox fields from the user list', async () => {
      const { controller, adminService, req } = makeController();
      adminService.listUsers.mockResolvedValue([
        {
          id: 3,
          displayName: '第三只微信',
          nickname: '第三只微信',
          wechatOpenIdMasked: 'sand...box',
          garmentCount: 0,
          acceptanceSandbox: true,
        },
      ]);

      await expect(controller.users(req)).resolves.toEqual({
        items: [
          expect.objectContaining({
            id: 3,
            acceptanceSandbox: true,
          }),
        ],
      });
    });
  });

  describe('wardrobe copy', () => {
    it('forwards preview and confirmed copy to the copy service', async () => {
      const { controller, copyService, req } = makeController();
      copyService.preview.mockResolvedValue({
        source: { id: 1, garmentCount: 1 },
        target: { id: 3, acceptanceSandbox: true },
      });
      copyService.copy.mockResolvedValue({
        complete: true,
        copied: { garments: 1, photos: 1, outfits: 1, calendars: 1, feedback: 1 },
      });

      const preview = (controller as any).previewWardrobeCopy;
      const copy = (controller as any).copyWardrobeCopy;
      expect(typeof preview).toBe('function');
      expect(typeof copy).toBe('function');

      await expect(preview.call(controller, 1, 3, req)).resolves.toEqual({
        source: { id: 1, garmentCount: 1 },
        target: { id: 3, acceptanceSandbox: true },
      });
      expect(copyService.preview).toHaveBeenCalledWith(7, 1, 3);

      await expect(
        copy.call(
          controller,
          {
            sourceUserId: 1,
            targetUserId: 3,
            sourceGarmentCount: 1,
            sourcePhotoCount: 1,
            sourceOutfitCount: 1,
            sourceCalendarCount: 1,
            sourceFeedbackCount: 1,
          },
          req,
        ),
      ).resolves.toEqual({
        complete: true,
        copied: { garments: 1, photos: 1, outfits: 1, calendars: 1, feedback: 1 },
      });
      expect(copyService.copy).toHaveBeenCalledWith(
        7,
        expect.objectContaining({
          sourceUserId: 1,
          targetUserId: 3,
          sourceGarmentCount: 1,
        }),
      );
    });
  });
});
