import { Injectable } from '@nestjs/common';
import {
  ClearExpertNotificationsUseCase,
  GetExpertNotificationsUseCase,
  GetExpertUnreadCountUseCase,
  MarkExpertNotificationAsReadUseCase,
} from './use-cases';
import { GetExpertNotificationsDto } from './dto/get-expert-notifications.dto';

/**
 * Service for expert-specific notification management.
 *
 * Wraps four Drizzle-backed use-cases:
 *  - Listing notifications with pagination/sort (scoped to expert_id)
 *  - Retrieving unread notification count
 *  - Marking a notification as read
 *  - Clearing all notifications for the expert
 */
@Injectable()
export class ExpertNotificationsService {
  constructor(
    private readonly getNotificationsUseCase: GetExpertNotificationsUseCase,
    private readonly getUnreadCountUseCase: GetExpertUnreadCountUseCase,
    private readonly markAsReadUseCase: MarkExpertNotificationAsReadUseCase,
    private readonly clearAllUseCase: ClearExpertNotificationsUseCase,
  ) {}

  /**
   * Retrieves a paginated, sortable list of notifications for an expert.
   */
  async getNotifications(
    expertId: number,
    dto: GetExpertNotificationsDto,
  ) {
    return this.getNotificationsUseCase.execute(expertId, dto);
  }

  /**
   * Retrieves the count of unread notifications for an expert.
   */
  async getUnreadCount(expertId: number) {
    return this.getUnreadCountUseCase.execute(expertId);
  }

  /**
   * Marks a notification as read for an expert.
   */
  async markAsRead(expertId: number, notificationId: number) {
    return this.markAsReadUseCase.execute(notificationId, expertId);
  }

  /**
   * Deletes all notifications for an expert.
   */
  async clearAll(expertId: number) {
    return this.clearAllUseCase.execute(expertId);
  }
}
