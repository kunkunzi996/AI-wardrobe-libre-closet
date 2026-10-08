import {
  CanActivate,
  Body,
  Controller,
  ExecutionContext,
  Get,
  Header,
  Injectable,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { ConditionalAuthGuard } from '../auth/conditional-auth.guard';
import type { Payload } from '../auth/dto/payload.dto';
import type { GarmentPhotoRole } from './dto/garment-image-normalization.dto';
import { GarmentService } from './garment.service';
import { GarmentImageNormalizationService } from './garment-image-normalization.service';
import { garmentViewModel } from './view-models/garment-photo.view-model';

/** 无令牌的图片请求直接拒绝；JWT 验证仍使用既有 Guard。 */
@Injectable()
export class GarmentPhotoTokenGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const authorization = request.headers.authorization;
    const header = Array.isArray(authorization)
      ? authorization[0]
      : authorization;
    const bearer = header?.startsWith('Bearer ')
      ? header.slice(7).trim()
      : undefined;
    const cookie = (request.cookies as Record<string, string> | undefined)
      ?.access_token;
    if (!bearer && !cookie) throw new UnauthorizedException('请登录后查看图片');
    return true;
  }
}

@Controller('api/miniapp/garments')
@UseGuards(GarmentPhotoTokenGuard, ConditionalAuthGuard)
export class MiniappGarmentImageController {
  constructor(
    private readonly garmentService: GarmentService,
    private readonly normalization: GarmentImageNormalizationService,
  ) {}

  @Post(':id/normalization')
  async start(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { attemptKey?: unknown },
    @Req() req: FastifyRequest,
  ) {
    return {
      item: await this.normalization.start(
        id,
        (req['user'] as Payload | undefined)?.userId,
        body?.attemptKey,
        this.origin(req),
      ),
    };
  }

  @Get(':id/normalization')
  @Header('Cache-Control', 'private, no-store')
  async get(@Param('id', ParseIntPipe) id: number, @Req() req: FastifyRequest) {
    return {
      item: await this.normalization.get(
        id,
        (req['user'] as Payload | undefined)?.userId,
        this.origin(req),
      ),
    };
  }

  @Post(':id/normalization/adopt')
  async adopt(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { attemptKey?: unknown },
    @Req() req: FastifyRequest,
  ) {
    const garment = await this.normalization.adopt(
      id,
      (req['user'] as Payload | undefined)?.userId,
      body?.attemptKey,
    );
    return { item: garmentViewModel(garment, this.origin(req)) };
  }

  private origin(req: FastifyRequest): string {
    const protocol = String(
      req.headers['x-forwarded-proto'] ?? req.protocol ?? 'https',
    )
      .split(',')[0]
      .trim();
    const host = String(
      req.headers['x-forwarded-host'] ?? req.headers.host ?? '',
    )
      .split(',')[0]
      .trim();
    return host ? `${protocol}://${host}` : '';
  }

  @Get(':id/photos/:role')
  @Header('Cache-Control', 'private, no-store')
  async photo(
    @Param('id', ParseIntPipe) id: number,
    @Param('role') role: GarmentPhotoRole,
    @Query('v') version: string | undefined,
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const payload = request['user'] as Payload | undefined;
    const photo =
      role === 'candidate'
        ? await this.normalization.getCandidate(id, payload?.userId, version)
        : await this.garmentService.readOwnedPhoto(
            id,
            payload?.userId,
            role,
            version,
          );
    reply.header('Content-Type', photo.mimetype);
    return photo.stream;
  }
}
