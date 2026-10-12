import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { and, eq, inArray } from 'drizzle-orm';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import {
  clientAccounts,
  coupons,
  userCoupons,
} from '@/core/drizzledb/schema';
import { CouponStatus } from '@/core/enums';

@Injectable()
export class BulkAssignCouponUseCase {
  private readonly logger = new Logger(BulkAssignCouponUseCase.name);

  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async execute(couponCode: string, userIds: (string | number)[]) {
    const [coupon] = await this.db
      .select()
      .from(coupons)
      .where(
        and(
          eq(coupons.code, couponCode),
          eq(coupons.is_active, true),
          eq(coupons.status, CouponStatus.ACTIVE),
        ),
      )
      .limit(1);

    if (!coupon) {
      throw new NotFoundException(
        `Active coupon with code "${couponCode}" not found`,
      );
    }

    this.logger.log(
      `Assigning coupon ${couponCode} to ${userIds.length} users bulk.`,
    );

    if (userIds.length === 0) {
      return {
        success: true,
        totalMatched: 0,
        assignedCount: 0,
      };
    }

    // 1. Fetch ClientAccount IDs for the provided user IDs (Only those that exist)
    const accounts = await this.db
      .select({ id: clientAccounts.id })
      .from(clientAccounts)
      .where(inArray(clientAccounts.user_id, userIds.map(Number)));

    if (accounts.length === 0) {
      return {
        success: true,
        totalMatched: userIds.length,
        assignedCount: 0,
      };
    }

    // 2. Perform a Bulk Insert ignoring conflicts
    const now = new Date();
    const valuesToInsert = accounts.map((account) => ({
      client_id: account.id,
      coupon_id: coupon.id,
      is_used: false,
      assigned_at: now,
      updated_at: now,
    }));

    const inserted = await this.db
      .insert(userCoupons)
      .values(valuesToInsert)
      .onConflictDoNothing()
      .returning();

    return {
      success: true,
      totalMatched: userIds.length,
      assignedCount: inserted.length,
    };
  }
}
