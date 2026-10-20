import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import { ViewContextService } from './view-context/view-context.service';

export function exceptionMessageText(message: unknown): string {
  if (typeof message === 'string') return message;
  const nested = (message as { message?: unknown } | null)?.message;
  if (typeof nested === 'string') return nested;
  if (Array.isArray(nested)) return nested.map(String).join('；');
  return '';
}

@Catch()
export class ErrorViewFilter implements ExceptionFilter {
  private logger = new Logger(ErrorViewFilter.name);

  constructor(private readonly viewContextService: ViewContextService) {}

  async catch(exception: unknown, host: ArgumentsHost) {
    this.logger.warn(exception);

    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();

    if (response.sent) {
      this.logger.warn('Response already sent, skipping error filter');
      return;
    }

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';
    if (this.sendApiCutoutFailure(response, request, status, message)) return;

    try {
      const context =
        (response as any).locals ||
        (await this.viewContextService.buildContext(request));
      await response.status(status).view('error', {
        layout: 'layout',
        statusCode: status,
        message:
          typeof message === 'string' ? message : (message as any).message,
        timestamp: new Date().toISOString(),
        path: request.url,
        ...context,
      });
    } catch (renderError) {
      this.logger.error(renderError);
      response.status(status).send({ statusCode: status, message });
    }
  }

  // 小程序上传只能读响应正文。抠图失败直接回 JSON，避免错误页把提示包进 HTML。
  private sendApiCutoutFailure(
    response: FastifyReply,
    request: FastifyRequest,
    status: number,
    message: unknown,
  ): boolean {
    const messageText = exceptionMessageText(message);
    const requestPath = request.url?.split('?')[0] ?? '';
    const isApi = requestPath === '/api' || requestPath.startsWith('/api/');
    if (messageText !== '抠图失败，请重试' || !isApi) return false;
    response.status(status).send({ statusCode: status, message: messageText });
    return true;
  }
}
