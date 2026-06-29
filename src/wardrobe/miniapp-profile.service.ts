import { EntityManager, EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import type { MultipartFile } from '@fastify/multipart';
import { Injectable, NotFoundException } from '@nestjs/common';
import { User } from '../dal/entity/user.entity';
import { FileService } from '../file/file-service.abstract';

@Injectable()
export class MiniappProfileService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: EntityRepository<User>,
    private readonly em: EntityManager,
    private readonly fileService: FileService,
  ) {}

  async getProfile(userId: number): Promise<User> {
    const user = await this.userRepository.findOne(
      { id: userId },
      { populate: ['avatar'] },
    );
    if (!user) throw new NotFoundException('用户不存在');
    return user;
  }

  async updateProfile(
    userId: number,
    data: { nickname?: string; bio?: string },
    avatarUpload?: MultipartFile,
  ): Promise<User> {
    const user = await this.getProfile(userId);

    if (data.nickname !== undefined) {
      user.nickname = data.nickname.trim() || undefined;
    }
    if (data.bio !== undefined) {
      user.bio = data.bio.trim() || undefined;
    }

    if (avatarUpload) {
      user.avatar = await this.fileService.storeOriginalImageFromFileUpload(
        avatarUpload,
        userId,
      );
    }

    await this.em.persistAndFlush(user);
    return user;
  }
}
