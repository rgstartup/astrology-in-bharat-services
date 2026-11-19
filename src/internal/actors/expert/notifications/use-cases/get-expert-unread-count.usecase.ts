import { Inject, Injectable } from "@nestjs/common";
import { and, count, eq } from "drizzle-orm";
import { DRIZZLE } from "@/core/drizzledb/drizzle.constants";
import type { DrizzleDb } from "@/core/drizzledb/drizzle.types";
import { notifications } from "@/core/drizzledb/schema";

/**
 * Retrieves the count of unread notifications for a given expert.
 *
 * @param expertId - The expert's ID (from `@CurrentExpert()`)
 * @returns Number of unread notifications
 * @throws {Error} When the database query fails
 */
@Injectable()
export class GetExpertUnreadCountUseCase {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async execute(expertId: number) {
    const [{ count: countResult }] = await this.db
      .select({ count: count() })
      .from(notifications)
      .where(
        and(
          eq(notifications.expert_id, Number(expertId)),
          eq(notifications.is_read, false),
        ),
      );

    return Number(countResult);
  }
}
