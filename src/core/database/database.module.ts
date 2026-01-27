// src/database/database.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { DatabaseService } from './database.service';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule], // import ConfigModule to access ConfigService
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const databaseUrl = process.env.DATABASE_URL;
        if (!databaseUrl)
          throw new Error('Database config not found: DATABASE_URL is missing');

        return {
          type: 'postgres',
          url: databaseUrl,
          autoLoadEntities: true,
          synchronize: process.env.NODE_ENV !== 'production',
          logging: true,
          schema: 'public', // Force schema to public
          ssl: {
            rejectUnauthorized: false, // ✅ Supabase requires SSL
          },
        };
      },
    }),
  ],
  providers: [DatabaseService],
  exports: [DatabaseService],
})
export class DatabaseModule {}
