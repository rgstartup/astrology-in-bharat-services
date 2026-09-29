import { Inject, Injectable } from '@nestjs/common';
import { count, desc, eq } from 'drizzle-orm';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import { notifications } from '@/core/drizzledb/schema';
import { GetNotificationsDto } from '@/internal/notification/dto/get-notifications.dto';

@Injectable()
export class GetClientNotificationsUseCase {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async execute(clientId: number, dto: GetNotificationsDto) {
    const { limit = 20, offset = 0 } = dto;
    const data = await this.db
      .select()
      .from(notifications)
      .where(eq(notifications.client_id, Number(clientId)))
      .orderBy(desc(notifications.created_at))
      .limit(limit)
      .offset(offset);

    const [{ totalCount }] = await this.db
      .select({ totalCount: count() })
      .from(notifications)
      .where(eq(notifications.client_id, Number(clientId)));

    return { data, totalCount };
  }
}
