import { Readable } from 'node:stream';
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
    };
    const fileService = {
      get: jest.fn(async () => Readable.from(tinyPng)),
    };
    const controller = new MiniappAdminController(
      adminService as any,
      fileService as any,
    );
    const req = { user: { userId: 7 } } as any;
    return { controller, adminService, fileService, req };
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
});
