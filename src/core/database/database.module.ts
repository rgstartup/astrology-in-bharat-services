import { Module } from '@nestjs/common';
import { DATABASE_CONNECTION, db } from '../../lib/drizzle';

@Module({
  providers: [
    {
      provide: DATABASE_CONNECTION,
      useValue: db,
    },
  ],
  exports: [DATABASE_CONNECTION],
})
export class DatabaseModule {}
