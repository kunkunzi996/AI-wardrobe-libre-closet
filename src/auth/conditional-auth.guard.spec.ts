import { ConditionalAuthGuard } from './conditional-auth.guard';

describe('ConditionalAuthGuard', () => {
  const makeContext = (request: any, response: any = { redirect: jest.fn() }) =>
    ({
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
    }) as any;

  it('reads miniapp Bearer tokens even when normal web auth is disabled', async () => {
    const jwtService = {
      verifyAsync: jest.fn(async () => ({
        userId: 42,
        pwf: 'finger',
      })),
    };
    const configService = {
      get: jest.fn((key: string) =>
        key === 'AUTH_ENABLED' ? false : 'jwt-secret',
      ),
    };
    const authService = {
      verifyPwf: jest.fn(),
    };
    const guard = new ConditionalAuthGuard(
      jwtService as any,
      configService as any,
      authService as any,
    );
    const request = {
      headers: { authorization: 'Bearer miniapp-token' },
    };

    await expect(guard.canActivate(makeContext(request))).resolves.toBe(true);

    expect(jwtService.verifyAsync).toHaveBeenCalledWith('miniapp-token', {
      secret: 'jwt-secret',
    });
    expect(authService.verifyPwf).toHaveBeenCalledWith({
      userId: 42,
      pwf: 'finger',
    });
    expect(request['user']).toEqual({ userId: 42, pwf: 'finger' });
  });
});
