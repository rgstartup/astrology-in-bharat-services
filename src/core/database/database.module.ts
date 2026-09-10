// src/database/database.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DatabaseConfig } from '../../config/db.config';
import { DatabaseService } from './database.service';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule], // import ConfigModule to access ConfigService
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const dbConfig = configService.get<DatabaseConfig>('database');

        if (!dbConfig) throw new Error('Database config not found');

        return {
          type: 'postgres',
          url: dbConfig.url,
          // host: dbConfig.host,
          // port: dbConfig.port,
          // username: dbConfig.username,
          // password: dbConfig.password,
          entities: [__dirname + '/../../**/*.entity{.ts,.js}'],
          autoLoadEntities: true, // automatically load entities registered in modules
          // synchronize: process.env.NODE_ENV !== 'production', // set to false in production
          synchronize: true, // set to false in production
          poolSize: dbConfig.max_connections,
          retryAttempts: 2, // number of retry attempts for database connection
          retryDelay: 3000, // delay between retry attempts in milliseconds
        };
      },
    }),
  ],
  providers: [DatabaseService],
  exports: [DatabaseService],
})
export class DatabaseModule {}
