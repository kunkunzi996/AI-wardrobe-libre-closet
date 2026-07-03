import { EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Garment } from '../dal/entity/garment.entity';
import { User } from '../dal/entity/user.entity';

export interface MiniappAdminUserSummary {
  id: number;
  displayName: string;
  nickname: string;
  wechatOpenIdMasked: string;
  garmentCount: number;
}

@Injectable()
export class MiniappAdminService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: EntityRepository<User>,
    @InjectRepository(Garment)
    private readonly garmentRepository: EntityRepository<Garment>,
    private readonly configService: ConfigService,
  ) {}

  async isAdmin(userId?: number): Promise<boolean> {
    if (userId == null) return false;

    const adminUserIds = this.configValues('MINIAPP_ADMIN_USER_IDS');
    if (adminUserIds.has(String(userId))) return true;

    const adminOpenIds = this.configValues('MINIAPP_ADMIN_WECHAT_OPEN_IDS');
    if (adminOpenIds.size === 0) return false;

    const user = await this.userRepository.findOne(userId);
    return Boolean(user?.wechatOpenId && adminOpenIds.has(user.wechatOpenId));
  }

  async listUsers(adminUserId?: number): Promise<MiniappAdminUserSummary[]> {
    await this.assertAdmin(adminUserId);

    const users = await this.userRepository.find(
      {},
      { orderBy: { id: 'ASC' } },
    );
    const garments = await this.garmentRepository.find(
      {},
      { populate: ['owner'] },
    );
    const garmentCounts = new Map<number, number>();

    for (const garment of garments) {
      const ownerId = garment.owner?.id;
      if (ownerId == null) continue;
      garmentCounts.set(ownerId, (garmentCounts.get(ownerId) ?? 0) + 1);
    }

    return users.map((user) => ({
      id: user.id,
      displayName: this.displayName(user),
      nickname: user.nickname ?? '',
      wechatOpenIdMasked: this.maskOpenId(user.wechatOpenId),
      garmentCount: garmentCounts.get(user.id) ?? 0,
    }));
  }

  async findUserGarments(
    adminUserId: number | undefined,
    targetUserId: number,
  ): Promise<Garment[]> {
    await this.assertAdmin(adminUserId);
    const user = await this.userRepository.findOne(targetUserId);
    if (!user) throw new NotFoundException('用户不存在');

    return this.garmentRepository.find(
      { owner: { id: targetUserId } },
      { populate: ['photo'], orderBy: { id: 'ASC' } },
    );
  }

  private async assertAdmin(userId?: number): Promise<void> {
    if (!(await this.isAdmin(userId))) {
      throw new ForbiddenException('只有管理员可以访问库存导出');
    }
  }

  private configValues(key: string): Set<string> {
    const raw = this.configService.get<string>(key) ?? '';
    return new Set(
      raw
        .split(/[,，\s]+/)
        .map((value) => value.trim())
        .filter(Boolean),
    );
  }

  private displayName(user: User): string {
    return (
      user.nickname ||
      user.email ||
      this.maskOpenId(user.wechatOpenId) ||
      `用户 #${user.id}`
    );
  }

  private maskOpenId(openId?: string): string {
    if (!openId) return '';
    if (openId.length <= 8) return openId;
    return `${openId.slice(0, 4)}...${openId.slice(-4)}`;
  }
}
