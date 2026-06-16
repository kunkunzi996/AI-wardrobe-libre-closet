import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { MiniappAuthService } from './miniapp-auth.service';

describe('MiniappAuthService', () => {
  const originalFetch = global.fetch;

  const makeService = () => {
    const userRepository = {
      findOne: jest.fn(),
      create: jest.fn((data) => ({ id: 42, ...data })),
    };
    const em = {
      persistAndFlush: jest.fn(),
    };
    const jwtService = {
      signAsync: jest.fn(async () => 'signed-token'),
    };
    const configService = {
      get: jest.fn((key: string) => {
        const values: Record<string, string> = {
          WECHAT_MINIAPP_APP_ID: 'wx-app-id',
          WECHAT_MINIAPP_APP_SECRET: 'wx-secret',
        };
        return values[key];
      }),
    };
    const service = new MiniappAuthService(
      userRepository as any,
      em as any,
      jwtService as any,
      configService as any,
    );

    return { service, userRepository, em, jwtService, configService };
  };

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('creates a miniapp user and returns a JWT token', async () => {
    const { service, userRepository, em, jwtService } = makeService();
    userRepository.findOne.mockResolvedValue(undefined);
    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({ openid: 'openid-abc' }),
    })) as any;

    await expect(service.loginWithCode(' wx-code ')).resolves.toEqual({
      accessToken: 'signed-token',
      expiresIn: 31536000,
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('js_code=wx-code'),
    );
    expect(userRepository.findOne).toHaveBeenCalledWith({
      wechatOpenId: 'openid-abc',
    });
    expect(userRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ wechatOpenId: 'openid-abc' }),
    );
    expect(em.persistAndFlush).toHaveBeenCalledWith(
      expect.objectContaining({ wechatOpenId: 'openid-abc' }),
    );
    expect(jwtService.signAsync).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 42 }),
    );
  });

  it('reuses an existing miniapp user for the same openid', async () => {
    const { service, userRepository, em, jwtService } = makeService();
    userRepository.findOne.mockResolvedValue({
      id: 7,
      password: 'miniapp:existing-password',
      wechatOpenId: 'openid-abc',
    });
    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({ openid: 'openid-abc' }),
    })) as any;

    await service.loginWithCode('wx-code');

    expect(userRepository.create).not.toHaveBeenCalled();
    expect(em.persistAndFlush).not.toHaveBeenCalled();
    expect(jwtService.signAsync).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 7, pwf: 'password' }),
    );
  });

  it('rejects empty code and failed WeChat responses', async () => {
    const { service } = makeService();

    await expect(service.loginWithCode('')).rejects.toBeInstanceOf(
      BadRequestException,
    );

    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({ errcode: 40029, errmsg: 'invalid code' }),
    })) as any;

    await expect(service.loginWithCode('bad-code')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
