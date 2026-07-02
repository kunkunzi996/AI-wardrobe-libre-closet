import { EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Injectable, Logger } from '@nestjs/common';
import { OutfitFeedback } from '../dal/entity/outfit-feedback.entity';
import { User } from '../dal/entity/user.entity';

export interface CreateOutfitFeedbackInput {
  rating: string;
  comment?: string;
  requestText?: string;
  planTitle?: string;
  planReason?: string;
  garmentIds?: number[];
  source?: string;
  coreGarmentId?: number;
}

@Injectable()
export class OutfitFeedbackService {
  private readonly logger = new Logger(OutfitFeedbackService.name);

  constructor(
    @InjectRepository(OutfitFeedback)
    private readonly feedbackRepository: EntityRepository<OutfitFeedback>,
    @InjectRepository(User)
    private readonly userRepository: EntityRepository<User>,
  ) {}

  async create(
    input: CreateOutfitFeedbackInput,
    userId?: number,
  ): Promise<OutfitFeedback> {
    const feedback = this.feedbackRepository.create({
      createdAt: new Date(),
      rating: input.rating,
      comment: input.comment,
      requestText: input.requestText,
      planTitle: input.planTitle,
      planReason: input.planReason,
      garmentIds: input.garmentIds,
      source: input.source,
      coreGarmentId: input.coreGarmentId,
    });

    if (userId != null) {
      const user = await this.userRepository.findOneOrFail(userId);
      feedback.owner = user as any;
    }

    await this.feedbackRepository.getEntityManager().persistAndFlush(feedback);
    this.logger.log(
      `Outfit feedback saved: rating=${input.rating} userId=${userId}`,
    );
    return feedback;
  }

  async findAll(userId?: number): Promise<OutfitFeedback[]> {
    return this.feedbackRepository.find(
      userId != null ? { owner: { id: userId } } : { owner: null },
      { orderBy: { id: 'DESC' } },
    );
  }
}
