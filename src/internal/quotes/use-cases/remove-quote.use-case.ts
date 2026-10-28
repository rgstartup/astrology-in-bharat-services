import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DrizzleService } from '@/core/drizzledb/drizzle.service';
import { quotes } from '@/core/drizzledb/schema';
import { BooleanMessage } from '@/shared/dto/boolean-message.dto';
import { QuoteNotFoundError } from '../domain/errors/quote.errors';

/** Deletes a quote by its primary key. */
@Injectable()
export class RemoveQuoteUseCase {
  /**
   * Creates the use-case with the application's Drizzle database client.
   *
   * @param drizzleService Provides the typed Drizzle client.
   * @returns An initialized quote delete use-case instance.
   * @throws Any error raised while resolving the injected database provider.
   */
  constructor(private readonly drizzleService: DrizzleService) {}

  /**
   * Deletes one quote and returns the established success response.
   *
   * @param id Primary key of the quote to delete.
   * @returns The established boolean-message response.
   * @throws QuoteNotFoundError when the quote does not exist, or a database error.
   */
  async execute(id: number): Promise<BooleanMessage> {
    const [deleted] = await this.drizzleService.db
      .delete(quotes)
      .where(eq(quotes.id, id))
      .returning({ id: quotes.id });

    if (!deleted) throw new QuoteNotFoundError(id);
    return new BooleanMessage();
  }
}
