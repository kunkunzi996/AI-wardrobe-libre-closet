import { EntityManager, EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';
import { User } from '../dal/entity/user.entity';
import type { Payload } from './dto/payload.dto';

type WechatCodeSession = {
  openid?: string;
  errcode?: number;
  errmsg?: string;
};

@Injectable()
export class MiniappAuthService {
  private readonly logger = new Logger(MiniappAuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: EntityRepository<User>,
    private readonly em: EntityManager,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async loginWithCode(code: string | undefined) {
    const trimmedCode = code?.trim();
    if (!trimmedCode) {
      throw new BadRequestException('微信登录 code 不能为空');
    }

    const openid = await this.exchangeCodeForOpenId(trimmedCode);
    const user = await this.findOrCreateMiniappUser(openid);
    const accessToken = await this.jwtService.signAsync({
      userId: user.id,
      pwf: user.password.slice(-8),
    } as Payload);

    return {
      accessToken,
      expiresIn: 365 * 24 * 60 * 60,
    };
  }

  private async exchangeCodeForOpenId(code: string): Promise<string> {
    const appId = this.configService.get<string>('WECHAT_MINIAPP_APP_ID');
    const appSecret = this.configService.get<string>(
      'WECHAT_MINIAPP_APP_SECRET',
    );
    if (!appId || !appSecret) {
      throw new BadRequestException('服务器未配置微信小程序登录参数');
    }

    const url =
      'https://api.weixin.qq.com/sns/jscode2session' +
      `?appid=${encodeURIComponent(appId)}` +
      `&secret=${encodeURIComponent(appSecret)}` +
      `&js_code=${encodeURIComponent(code)}` +
      '&grant_type=authorization_code';

    const response = await fetch(url);
    if (!response.ok) {
      this.logger.warn(`Wechat code2session HTTP ${response.status}`);
      throw new UnauthorizedException('微信登录失败，请稍后重试');
    }

    const data = (await response.json()) as WechatCodeSession;
    if (data.errcode || !data.openid) {
      this.logger.warn(
        `Wechat code2session failed: ${data.errcode ?? 'NO_OPENID'} ${data.errmsg ?? ''}`,
      );
      throw new UnauthorizedException('微信登录失败，请重新进入小程序');
    }

    return data.openid;
  }

  private async findOrCreateMiniappUser(openid: string): Promise<User> {
    const existing = await this.userRepository.findOne({ wechatOpenId: openid });
    if (existing) return existing;

    const user = this.userRepository.create({
      wechatOpenId: openid,
      password: `miniapp:${randomUUID()}`,
    } as User);
    await this.em.persistAndFlush(user);
    return user;
  }
}
