import { MiniappAdminController } from './miniapp-admin.controller';

describe('MiniappAdminController', () => {
  const makeController = () => {
    const adminService = {
      listUsers: jest.fn(),
      findUserGarments: jest.fn(),
    };
    const controller = new MiniappAdminController(adminService as any);
    const req = { user: { userId: 7 } } as any;
    return { controller, adminService, req };
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
    const { controller, adminService, req } = makeController();
    adminService.findUserGarments.mockResolvedValue([
      {
        id: 3,
        name: '黑色短袖',
        category: 'tops',
        color: 'black',
        status: 'wearable',
        seasons: ['夏'],
        styleTags: ['通勤'],
        sceneTags: ['日常'],
      },
    ]);
    const reply = { header: jest.fn(), send: jest.fn() } as any;

    await controller.exportUserGarments(12, req, reply);

    expect(adminService.findUserGarments).toHaveBeenCalledWith(7, 12);
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
