import {
  integer,
  pgSchema,
  serial,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';
import { MediaSource } from '@/internal/media/enum';

export const contentSchema = pgSchema('content');

export const mediaSourceEnum = contentSchema.enum(
  'media_source_enum',
  MediaSource,
);

/**
 * Minimal Drizzle mirror of `Media` (`content.media` TypeORM entity).
 * Source: src/internal/media/entities/media.entity.ts
 *
 * Keys are snake_case end-to-end (JS keys match DB columns).
 *
 * Only what client-auth flows need today (Google avatar persistence).
 * The `media_source_enum` name mirrors TypeORM's generated PG enum type
 * (`{table}_{column}_enum` in the table schema). Expand when the media
 * module itself migrates.
 */
export const media = contentSchema.table('media', {
  id: serial('id').primaryKey(),
  url: varchar('url').notNull(),
  source: mediaSourceEnum('source').notNull().default(MediaSource.CLOUDINARY),
  public_id: varchar('public_id', { length: 255 }),
  mime_type: varchar('mime_type', { length: 100 }),
  alt_text: varchar('alt_text', { length: 500 }),
  file_size: integer('file_size'),
  file_name: varchar('file_name', { length: 255 }),
  created_at: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  deleted_at: timestamp('deleted_at', { withTimezone: true }),
});

export type MediaRow = typeof media.$inferSelect;
export type NewMediaRow = typeof media.$inferInsert;
