import { Injectable } from '@nestjs/common';
import { DrizzleService } from '@/core/drizzledb/drizzle.service';
import { quotes } from '@/core/drizzledb/schema';
import type { QuoteRow } from '@/core/drizzledb/schema';

/** Reads every quote from the consultation quote catalog. */
@Injectable()
export class FindAllQuotesUseCase {
  /**
   * Creates the use-case with the application's Drizzle database client.
   *
   * @param drizzleService Provides the typed Drizzle client.
   * @returns An initialized quote query use-case instance.
   * @throws Any error raised while resolving the injected database provider.
   */
  constructor(private readonly drizzleService: DrizzleService) {}

  /**
   * Returns all persisted quotes.
   *
   * @returns Quote rows in database order.
   * @throws Any database error raised while reading the quote table.
   */
  async execute(): Promise<QuoteRow[]> {
    return this.drizzleService.db.select().from(quotes);
  }
}
