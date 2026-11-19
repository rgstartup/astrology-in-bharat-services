import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import { notifications } from '@/core/drizzledb/schema';

/**
 * Marks a specific notification as read for a given expert.
 *
 * @param notificationId - The notification ID
 * @param expertId - The expert's ID (from `@CurrentExpert()`)
 * @throws {NotFoundException} When the notification does not exist or is not owned by the expert
 * @throws {Error} When the database query fails
 */
@Injectable()
export class MarkExpertNotificationAsReadUseCase {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async execute(notificationId: number, expertId: number) {
    const [notification] = await this.db
      .select({ id: notifications.id })
      .from(notifications)
      .where(
        and(
          eq(notifications.id, Number(notificationId)),
          eq(notifications.expert_id, Number(expertId)),
        ),
      )
      .limit(1);

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    await this.db
      .update(notifications)
      .set({ is_read: true })
      .where(
        and(
          eq(notifications.id, Number(notificationId)),
          eq(notifications.expert_id, Number(expertId)),
        ),
      );
  }
}
