import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { MultipartFile } from '@fastify/multipart';
import type { FastifyRequest } from 'fastify';
import { ConditionalAuthGuard } from '../auth/conditional-auth.guard';
import type { Payload } from '../auth/dto/payload.dto';
import type { User } from '../dal/entity/user.entity';
import { MiniappAdminService } from './miniapp-admin.service';
import { MiniappProfileService } from './miniapp-profile.service';

type MiniappRequest = FastifyRequest & {
  protocol?: string;
  host?: string;
  isMultipart?: () => boolean;
};

type ProfileBody = {
  nickname?: string;
  bio?: string;
};

@UseGuards(ConditionalAuthGuard)
@Controller('api/miniapp/profile')
export class MiniappProfileController {
  constructor(
    private readonly profileService: MiniappProfileService,
    private readonly adminService: MiniappAdminService,
  ) {}

  @Get()
  async get(@Req() req: MiniappRequest) {
    const user = await this.profileService.getProfile(this.userId(req));
    return { item: await this.toProfile(user, req) };
  }

  @Post()
  async update(@Body() body: ProfileBody = {}, @Req() req: MiniappRequest) {
    let nickname = body.nickname;
    let bio = body.bio;
    let avatar: MultipartFile | undefined;

    if (typeof req.isMultipart === 'function' && req.isMultipart()) {
      const file = await req.file?.();
      if (file) {
        if (!file.mimetype?.startsWith('image/')) {
          file.file.resume();
          throw new BadRequestException('头像必须是图片');
        }
        avatar = file;
        nickname = this.fieldValue(file, 'nickname') ?? nickname;
        bio = this.fieldValue(file, 'bio') ?? bio;
      }
    }

    const user = await this.profileService.updateProfile(
      this.userId(req),
      { nickname, bio },
      avatar,
    );
    return { item: await this.toProfile(user, req) };
  }

  private userId(req: FastifyRequest): number {
    return (req['user'] as Payload | undefined)?.userId;
  }

  private fieldValue(file: MultipartFile, name: string): string | undefined {
    const value = (file.fields?.[name] as { value?: unknown } | undefined)
      ?.value;
    if (typeof value !== 'string') return undefined;
    return value;
  }

  private async toProfile(user: User, req: MiniappRequest) {
    const fileName = user.avatar?.fileName;
    return {
      nickname: user.nickname ?? '',
      bio: user.bio ?? '',
      avatarUrl: fileName ? `${this.origin(req)}/file/${fileName}` : '',
      isAdmin: await this.adminService.isAdmin(user.id),
    };
  }

  private origin(req: MiniappRequest): string {
    const forwardedProto = req.headers?.['x-forwarded-proto'];
    const protocol =
      (Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto) ??
      req.protocol ??
      'https';
    const host = req.host ?? req.headers?.host ?? 'aimatchwear.asia';
    return `${protocol}://${host}`;
  }
}
