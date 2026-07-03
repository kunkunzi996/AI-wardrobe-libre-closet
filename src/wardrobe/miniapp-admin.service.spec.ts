import { ForbiddenException } from '@nestjs/common';
import { MiniappAdminService } from './miniapp-admin.service';

describe('MiniappAdminService', () => {
  const makeService = (config: Record<string, string> = {}) => {
    const users = [
      { id: 7, nickname: '管理员', wechatOpenId: 'admin-openid' },
      { id: 12, nickname: '普通用户', wechatOpenId: 'normal-openid' },
    ];
    const userRepository = {
      findOne: jest.fn(async (id: number) =>
        users.find((user) => user.id === id),
      ),
      find: jest.fn(async () => users),
    };
    const garmentRepository = {
      find: jest.fn(async () => [
        { id: 1, owner: { id: 12 } },
        { id: 2, owner: { id: 12 } },
      ]),
    };
    const configService = {
      get: jest.fn((key: string) => config[key]),
    };
    const service = new MiniappAdminService(
      userRepository as any,
      garmentRepository as any,
      configService as any,
    );
    return { service, userRepository, garmentRepository };
  };

  it('allows admin user ids from config', async () => {
    const { service } = makeService({ MINIAPP_ADMIN_USER_IDS: '7' });

    await expect(service.isAdmin(7)).resolves.toBe(true);
    await expect(service.listUsers(7)).resolves.toEqual([
      expect.objectContaining({ id: 7, garmentCount: 0 }),
      expect.objectContaining({ id: 12, garmentCount: 2 }),
    ]);
  });

  it('allows admin wechat open ids from config', async () => {
    const { service } = makeService({
      MINIAPP_ADMIN_WECHAT_OPEN_IDS: 'admin-openid',
    });

    await expect(service.isAdmin(7)).resolves.toBe(true);
  });

  it('rejects non-admin users', async () => {
    const { service } = makeService({ MINIAPP_ADMIN_USER_IDS: '7' });

    await expect(service.listUsers(12)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
