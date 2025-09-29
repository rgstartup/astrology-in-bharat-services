import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as authSchema from '../../schema/auth.schema';
import { client } from '../../schema/client.schema';
import { expert } from '../../schema/expert.schema';
import 'dotenv/config';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
});

export const db = drizzle(pool, {
  schema: Object.assign({}, authSchema, { client, expert }),
  casing: 'snake_case',
});

export const DATABASE_CONNECTION = 'DATABASE_CONNECTION';
export type DbType = typeof db;
