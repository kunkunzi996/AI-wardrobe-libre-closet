import { Readable } from 'node:stream';
import { BadRequestException } from '@nestjs/common';
import { User } from '../dal/entity/user.entity';
import { MiniappProfileController } from './miniapp-profile.controller';

describe('MiniappProfileController', () => {
  const makeUser = (overrides: Partial<User> = {}) =>
    Object.assign(new User(), {
      id: 9,
      nickname: '昆昆子',
      bio: '用穿搭整理生活。',
      avatar: { fileName: 'avatar.webp' },
      ...overrides,
    });

  const makeUpload = (fields: Record<string, string> = {}) =>
    ({
      mimetype: 'image/jpeg',
      file: Readable.from(Buffer.from('fake avatar')),
      fields: Object.fromEntries(
        Object.entries(fields).map(([key, value]) => [key, { value }]),
      ),
    }) as any;

  const makeController = () => {
    const profileService = {
      getProfile: jest.fn(),
      updateProfile: jest.fn(),
    };
    const adminService = {
      isAdmin: jest.fn().mockResolvedValue(false),
    };
    const controller = new MiniappProfileController(
      profileService as any,
      adminService as any,
    );
    const req = {
      protocol: 'https',
      host: 'aimatchwear.asia',
      headers: {},
      user: { userId: 42 },
      isMultipart: jest.fn().mockReturnValue(false),
      file: jest.fn(),
    } as any;
    return { controller, profileService, adminService, req };
  };

  it('returns current user profile with avatar url', async () => {
    const { controller, profileService, req } = makeController();
    profileService.getProfile.mockResolvedValue(makeUser());

    await expect(controller.get(req)).resolves.toEqual({
      item: {
        nickname: '昆昆子',
        bio: '用穿搭整理生活。',
        avatarUrl: 'https://aimatchwear.asia/file/avatar.webp',
        isAdmin: false,
      },
    });
    expect(profileService.getProfile).toHaveBeenCalledWith(42);
  });

  it('updates nickname and bio from json without avatar', async () => {
    const { controller, profileService, req } = makeController();
    profileService.updateProfile.mockResolvedValue(
      makeUser({
        nickname: '小衣橱',
        bio: '今天也要好好穿衣。',
        avatar: undefined,
      }),
    );

    await expect(
      controller.update({ nickname: '小衣橱', bio: '今天也要好好穿衣。' }, req),
    ).resolves.toEqual({
      item: {
        nickname: '小衣橱',
        bio: '今天也要好好穿衣。',
        avatarUrl: '',
        isAdmin: false,
      },
    });
    expect(profileService.updateProfile).toHaveBeenCalledWith(
      42,
      { nickname: '小衣橱', bio: '今天也要好好穿衣。' },
      undefined,
    );
  });

  it('updates nickname, bio and avatar from multipart upload', async () => {
    const { controller, profileService, req } = makeController();
    const upload = makeUpload({
      nickname: '头像用户',
      bio: '换了新头像。',
    });
    req.isMultipart.mockReturnValue(true);
    req.file.mockResolvedValue(upload);
    profileService.updateProfile.mockResolvedValue(
      makeUser({
        nickname: '头像用户',
        bio: '换了新头像。',
        avatar: { fileName: 'new-avatar.webp' } as any,
      }),
    );

    await expect(controller.update({}, req)).resolves.toEqual({
      item: {
        nickname: '头像用户',
        bio: '换了新头像。',
        avatarUrl: 'https://aimatchwear.asia/file/new-avatar.webp',
        isAdmin: false,
      },
    });
    expect(profileService.updateProfile).toHaveBeenCalledWith(
      42,
      { nickname: '头像用户', bio: '换了新头像。' },
      upload,
    );
  });

  it('rejects non-image avatar upload', async () => {
    const { controller, profileService, req } = makeController();
    const upload = {
      mimetype: 'text/plain',
      file: { resume: jest.fn() },
      fields: {},
    } as any;
    req.isMultipart.mockReturnValue(true);
    req.file.mockResolvedValue(upload);

    await expect(controller.update({}, req)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(upload.file.resume).toHaveBeenCalled();
    expect(profileService.updateProfile).not.toHaveBeenCalled();
  });

  it('uses only jwt userId and ignores body user id', async () => {
    const { controller, profileService, req } = makeController();
    profileService.updateProfile.mockResolvedValue(makeUser());

    await controller.update(
      { nickname: '本人资料', bio: '不能改别人', userId: 999 } as any,
      req,
    );

    expect(profileService.updateProfile).toHaveBeenCalledWith(
      42,
      { nickname: '本人资料', bio: '不能改别人' },
      undefined,
    );
  });

  it('marks admin users in profile response', async () => {
    const { controller, profileService, adminService, req } = makeController();
    profileService.getProfile.mockResolvedValue(makeUser({ id: 42 }));
    adminService.isAdmin.mockResolvedValue(true);

    await expect(controller.get(req)).resolves.toEqual({
      item: expect.objectContaining({ isAdmin: true }),
    });
    expect(adminService.isAdmin).toHaveBeenCalledWith(42);
  });
});
