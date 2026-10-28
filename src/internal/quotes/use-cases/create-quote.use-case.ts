import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DrizzleService } from '@/core/drizzledb/drizzle.service';
import { quotes } from '@/core/drizzledb/schema';
import type { NewQuoteRow, QuoteRow } from '@/core/drizzledb/schema';
import { CreateQuoteDto } from '../dto/create-quote.dto';

const SEED_QUOTES: NewQuoteRow[] = [
  {
    text: 'Astrology is the supreme limb (eye) of the Vedas.',
    author: 'Sage Parasara',
    source: 'Brihat Parasara Hora Shastra',
  },
  {
    text: 'There are many incarnations of the unborn Lord. Janardana (Vishnu) has incarnated as the navagrahas (planets) to bestow on the living beings the results of their Karmas.',
    author: 'Sage Parasara',
    source: 'Brihat Parasara Hora Shastra',
  },
  {
    text: 'Whatever has been acquired by a person through his karma — whether good or bad — done in previous births, the hora now reveals its fruition or effects.',
    author: 'Varahamihira',
    source: 'Brihat Jataka',
  },
  {
    text: 'A child is born on that day and at that hour when the celestial rays are in mathematical harmony with his individual karma.',
    author: 'Sri Yukteswar',
  },
  {
    text: 'There is nothing in the world like a horoscope to help men in the acquisition of wealth, to save them like a boat in a sea of troubles and to serve them as a guide in their journeys.',
    author: 'Vaidyanatha Dikshita',
    source: 'Jataka Parijata',
  },
];

/**
 * Creates quotes and seeds the consultation quote catalog when it is empty.
 */
@Injectable()
export class CreateQuoteUseCase implements OnModuleInit {
  private readonly logger = new Logger(CreateQuoteUseCase.name);

  /**
   * Creates the quote use-case with the application's Drizzle database client.
   *
   * @param drizzleService Provides the typed Drizzle client.
   * @returns An initialized quote use-case instance.
   * @throws Any error raised while resolving the injected database provider.
   */
  constructor(private readonly drizzleService: DrizzleService) {}

  /**
   * Seeds the quote catalog once when the application starts and the table is empty.
   *
   * @returns A promise that resolves after the optional seed insert completes.
   * @throws Any database error raised while checking or seeding the quote table.
   */
  async onModuleInit(): Promise<void> {
    const existing = await this.drizzleService.db
      .select({ id: quotes.id })
      .from(quotes)
      .limit(1);

    if (existing.length > 0) return;

    this.logger.log('Seeding dummy quotes...');
    await this.drizzleService.db.insert(quotes).values(SEED_QUOTES);
    this.logger.log('Dummy quotes seeded successfully.');
  }

  /**
   * Inserts one quote and returns the persisted row.
   *
   * @param dto Quote fields to persist.
   * @returns The inserted quote row, including generated identifiers and timestamps.
   * @throws Any database error raised while inserting the quote.
   */
  async execute(dto: CreateQuoteDto): Promise<QuoteRow> {
    const [quote] = await this.drizzleService.db
      .insert(quotes)
      .values(dto)
      .returning();

    if (!quote) {
      throw new Error('Drizzle did not return the inserted quote row.');
    }

    return quote;
  }
}
