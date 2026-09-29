import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import { notifications } from '@/core/drizzledb/schema';

@Injectable()
export class MarkClientNotificationAsReadUseCase {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async execute(id: number, clientId: number): Promise<void> {
    const [notification] = await this.db
      .select({ id: notifications.id })
      .from(notifications)
      .where(
        and(
          eq(notifications.id, Number(id)),
          eq(notifications.client_id, Number(clientId)),
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
          eq(notifications.id, Number(id)),
          eq(notifications.client_id, Number(clientId)),
        ),
      );
  }
}
