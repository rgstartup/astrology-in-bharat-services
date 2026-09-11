import { Client } from 'pg';
import { Logger } from '@nestjs/common';
import 'dotenv/config';

export const REQUIRED_SCHEMAS = [
  'admin',
  'agent',
  'astrology',
  'auth',
  'client',
  'commerce',
  'consultations',
  'content',
  'expert',
  'finance',
  'merchant',
  'support',
];

/**
 * Ensures all PostgreSQL schemas used by TypeORM entities exist
 */
export async function ensurePostgresSchemasExist(): Promise<void> {
  const logger = new Logger('SchemaInitializer');

  const config = process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL }
    : {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432,
        user: process.env.DB_USER,
        password: process.env.DB_PASS || process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      };

  const client = new Client(config);

  try {
    await client.connect();
    for (const schema of REQUIRED_SCHEMAS) {
      await client.query(`CREATE SCHEMA IF NOT EXISTS "${schema}";`);
    }
    logger.log('All required database schemas verified.');
  } catch (error) {
    logger.warn(
      `Could not automatically verify schemas via raw pg client: ${
        error instanceof Error ? error.message : error
      }`,
    );
  } finally {
    try {
      await client.end();
    } catch {
      // ignore
    }
  }
}
