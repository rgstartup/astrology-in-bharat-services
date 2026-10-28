import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DrizzleService } from '@/core/drizzledb/drizzle.service';
import { quotes } from '@/core/drizzledb/schema';
import type { QuoteRow } from '@/core/drizzledb/schema';
import { QuoteNotFoundError } from '../domain/errors/quote.errors';

/** Reads a quote by its primary key. */
@Injectable()
export class FindQuoteUseCase {
  /**
   * Creates the use-case with the application's Drizzle database client.
   *
   * @param drizzleService Provides the typed Drizzle client.
   * @returns An initialized quote query use-case instance.
   * @throws Any error raised while resolving the injected database provider.
   */
  constructor(private readonly drizzleService: DrizzleService) {}

  /**
   * Looks up one quote and raises the domain error when it does not exist.
   *
   * @param id Primary key of the quote to read.
   * @returns The matching quote row.
   * @throws QuoteNotFoundError when no quote has the requested id, or a database error.
   */
  async execute(id: number): Promise<QuoteRow> {
    const [quote] = await this.drizzleService.db
      .select()
      .from(quotes)
      .where(eq(quotes.id, id))
      .limit(1);

    if (!quote) throw new QuoteNotFoundError(id);
    return quote;
  }
}
