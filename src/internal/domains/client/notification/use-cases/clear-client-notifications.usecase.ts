import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import { notifications } from '@/core/drizzledb/schema';

@Injectable()
export class ClearClientNotificationsUseCase {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async execute(clientId: number): Promise<void> {
    await this.db
      .delete(notifications)
      .where(eq(notifications.client_id, Number(clientId)));
  }
}
