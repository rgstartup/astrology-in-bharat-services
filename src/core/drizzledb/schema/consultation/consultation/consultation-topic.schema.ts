import {
  boolean,
  integer,
  pgSchema,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

const consultationsSchema = pgSchema('consultations');

/**
 * Drizzle mirror of `ConsultationTopic` (`consultations.consultation_topic`
 * TypeORM entity — singular table name kept as-is).
 * Source: src/internal/consultation/consultation/entities/consultation_topic.entity.ts
 *
 * Keys are snake_case end-to-end (JS keys match DB columns).
 * Standalone taxonomy table — no relations.
 */
export const consultationTopics = consultationsSchema.table(
  'consultation_topic',
  {
    id: serial('id').primaryKey(),
    title: text('title').notNull(),
    description: text('description'),
    slug: text('slug').notNull(),
    is_active: boolean('is_active').notNull().default(true),
    sort_order: integer('sort_order').notNull().default(0),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
);

export type ConsultationTopicRow = typeof consultationTopics.$inferSelect;
export type NewConsultationTopicRow = typeof consultationTopics.$inferInsert;
