import { Inject, Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { DRIZZLE } from "@/core/drizzledb/drizzle.constants";
import type { DrizzleDb } from "@/core/drizzledb/drizzle.types";
import { notifications } from "@/core/drizzledb/schema";

/**
 * Deletes all notifications for a given expert.
 *
 * @param expertId - The expert's ID (from `@CurrentExpert()`)
 * @throws {Error} When the database query fails
 */
@Injectable()
export class ClearExpertNotificationsUseCase {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async execute(expertId: number) {
    await this.db
      .delete(notifications)
      .where(eq(notifications.expert_id, Number(expertId)));
  }
}
