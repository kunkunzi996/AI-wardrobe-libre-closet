import { BadRequestException, type ArgumentsHost } from '@nestjs/common';
import type { ViewContextService } from './view-context/view-context.service';
import { ErrorViewFilter } from './error-view.filter';

describe('ErrorViewFilter cutout failure', () => {
  it('returns 抠图失败，请重试 as JSON for miniapp API routes', async () => {
    const send = jest.fn();
    const view = jest.fn();
    const status = jest.fn(() => ({ send, view }));
    const filter = new ErrorViewFilter({
      buildContext: jest.fn(),
    } as unknown as ViewContextService);

    await filter.catch(new BadRequestException('抠图失败，请重试'), {
      switchToHttp: () => ({
        getResponse: () => ({ sent: false, status }),
        getRequest: () => ({ url: '/api/miniapp/garments?unused=1' }),
      }),
    } as unknown as ArgumentsHost);

    expect(status).toHaveBeenCalledWith(400);
    expect(send).toHaveBeenCalledWith({
      statusCode: 400,
      message: '抠图失败，请重试',
    });
    expect(view).not.toHaveBeenCalled();
  });
});
