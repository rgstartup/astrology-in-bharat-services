import { PgTransaction } from 'drizzle-orm/pg-core';
import { schema } from './schema';
import type {
  NodePgDatabase,
  NodePgQueryResultHKT,
} from 'drizzle-orm/node-postgres';
import { ExtractTablesWithRelations } from 'drizzle-orm';

export type DrizzleDb = NodePgDatabase<typeof schema>;

export type DrizzleTx = PgTransaction<
  NodePgQueryResultHKT,
  typeof schema,
  ExtractTablesWithRelations<typeof schema>
>;
