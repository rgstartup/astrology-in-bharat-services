import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import { schema } from './schema';
import type { DrizzleDb } from './drizzle.types';
import type { DatabaseConfig } from '@/config/db.config';

/**
 * Owns the `pg` Pool + Drizzle client for the gradual TypeORM → Drizzle
 * migration. TypeORM stays authoritative until each module is migrated;
 * new code injects the Drizzle client via the `DRIZZLE` token.
 */
@Injectable()
export class DrizzleService implements OnModuleDestroy {
  private readonly logger = new Logger(DrizzleService.name);
  private readonly pool: Pool;
  readonly db: DrizzleDb;

  constructor(configService: ConfigService) {
    const dbConfig = configService.get<DatabaseConfig>('database');

    if (!dbConfig) {
      throw new Error('Database configuration not found');
    }

    this.pool = new Pool({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.username,
      password: dbConfig.password,
      database: dbConfig.database,
      max: dbConfig?.max_connections ?? 20,
    });

    this.pool.on('error', (err) => {
      this.logger.error('Drizzle pg pool error', err);
    });

    this.db = drizzle(this.pool, { schema });
  }

  async onModuleDestroy() {
    await this.pool.end();
  }

  /** Health check helper (e.g. for Terminus or startup probes). */
  async ping(): Promise<void> {
    await this.db.execute(sql`select 1`);
  }
}
