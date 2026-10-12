import { RoleEnum } from '../../../users/enums/Role.enum';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import { expertAccounts, reviews } from '@/core/drizzledb/schema';
import { NotificationService } from '../../../notification/notification.service';
import { NotificationType } from '../../../notification/entities/notification.entity';
import { BooleanMessage } from '../../../../shared/dto/boolean-message.dto';

@Injectable()
export class SendReviewResponseUseCase {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly notificationService: NotificationService,
  ) {}

  async execute(reviewId: number, message: string) {
    const review = await this.db.query.reviews.findFirst({
      where: eq(reviews.id, reviewId),
    });

    if (!review) {
      throw new NotFoundException(`Review with id ${reviewId} not found`);
    }

    if (!review.expert_id) {
      throw new NotFoundException(`Expert not found for this review`);
    }

    const expert = await this.db.query.expertAccounts.findFirst({
      where: eq(expertAccounts.id, review.expert_id),
      with: { user: true },
    });

    if (!expert || !expert.user) {
      throw new NotFoundException(`Expert or User not found for this review`);
    }

    // Send notification to the astrologer (expert)
    await this.notificationService.create(
      expert.id,
      RoleEnum.EXPERT,
      NotificationType.GENERAL,
      'Admin Message regarding review',
      message,
      { reviewId: review.id },
    );

    return new BooleanMessage(true, 'Review sent successfully');
  }
}

