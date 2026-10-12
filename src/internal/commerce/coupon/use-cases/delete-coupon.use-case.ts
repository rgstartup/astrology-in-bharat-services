import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import { coupons } from '@/core/drizzledb/schema';
import { BooleanMessage } from '@/shared/dto/boolean-message.dto';

@Injectable()
export class DeleteCouponUseCase {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async execute(id: number | string) {
    const [deleted] = await this.db
      .delete(coupons)
      .where(eq(coupons.id, Number(id)))
      .returning();

    if (!deleted) {
      throw new NotFoundException('Coupon not found');
    }

    return new BooleanMessage();
  }
}
