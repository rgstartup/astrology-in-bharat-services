import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DrizzleService } from '@/core/drizzledb/drizzle.service';
import { quotes } from '@/core/drizzledb/schema';
import { BooleanMessage } from '@/shared/dto/boolean-message.dto';
import { UpdateQuoteDto } from '../dto/update-quote.dto';
import { QuoteNotFoundError } from '../domain/errors/quote.errors';

/** Updates quote fields while maintaining the legacy timestamp behavior. */
@Injectable()
export class UpdateQuoteUseCase {
  /**
   * Creates the use-case with the application's Drizzle database client.
   *
   * @param drizzleService Provides the typed Drizzle client.
   * @returns An initialized quote update use-case instance.
   * @throws Any error raised while resolving the injected database provider.
   */
  constructor(private readonly drizzleService: DrizzleService) {}

  /**
   * Updates one quote and returns the established success response.
   *
   * @param id Primary key of the quote to update.
   * @param dto Fields to update.
   * @returns The established boolean-message response.
   * @throws QuoteNotFoundError when the quote does not exist, or a database error.
   */
  async execute(id: number, dto: UpdateQuoteDto): Promise<BooleanMessage> {
    const [updated] = await this.drizzleService.db
      .update(quotes)
      .set({ ...dto, updated_at: new Date() })
      .where(eq(quotes.id, id))
      .returning({ id: quotes.id });

    if (!updated) throw new QuoteNotFoundError(id);
    return new BooleanMessage();
  }
}
