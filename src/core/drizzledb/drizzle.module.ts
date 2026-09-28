import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DRIZZLE } from './drizzle.constants';
import { DrizzleService } from './drizzle.service';

/**
 * Global Drizzle provider coexisting with the TypeORM `DatabaseModule`.
 * Usage in migrated repositories/use-cases:
 *
 *   constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    DrizzleService,
    {
      provide: DRIZZLE,
      useFactory: (service: DrizzleService) => service.db,
      inject: [DrizzleService],
    },
  ],
  exports: [DRIZZLE, DrizzleService],
})
export class DrizzleModule {}
