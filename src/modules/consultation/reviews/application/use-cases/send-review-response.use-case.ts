import { RoleEnum } from '@/modules/users/infrastructure/enums/Role.enum';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from '../../infrastructure/entities/review.entity';
import { NotificationFacade } from '@/modules/notification/application/notification.facade';
import { NotificationType } from '@/modules/notification/infrastructure/entities/notification.entity';

@Injectable()
export class SendReviewResponseUseCase {
  constructor(
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
    private readonly notificationFacade: NotificationFacade,
  ) {}

  async execute(reviewId: string, message: string) {
    const review = await this.reviewRepository.findOne({
      where: { id: reviewId },
      relations: ['expert', 'expert.user'],
    });

    if (!review) {
      throw new NotFoundException(`Review with id ${reviewId} not found`);
    }

    if (!review.expert || !review.expert.user) {
      throw new NotFoundException(`Expert or User not found for this review`);
    }

    // Send notification to the astrologer (expert)
    await this.notificationFacade.create(
      review.expert.id,
      RoleEnum.EXPERT,
      NotificationType.GENERAL,
      'Admin Message regarding review',
      message,
      { reviewId: review.id },
    );

    return { success: true };
  }
}
