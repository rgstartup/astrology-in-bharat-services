import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { BooleanMessage } from '../../../../shared/dto/boolean-message.dto';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import { reviews } from '@/core/drizzledb/schema';

@Injectable()
export class DeleteReviewUseCase {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async execute(id: number) {
    const deleted = await this.db
      .delete(reviews)
      .where(eq(reviews.id, id))
      .returning();

    if (deleted.length === 0) {
      throw new NotFoundException(`Review with id ${id} not found`);
    }
    return new BooleanMessage(true, 'Review deleted successfully');
  }
}

