import { EventEmitterModule } from '@nestjs/event-emitter';
import { Global, Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { DrizzleModule } from './drizzledb/drizzle.module';
import { JwtModule } from './jwt/jwt.module';
import { RedisModule } from './redis/redis.module';

@Global()
@Module({
  imports: [
    DatabaseModule,
    DrizzleModule,
    JwtModule,
    RedisModule,
    EventEmitterModule.forRoot(),
  ],
  exports: [DatabaseModule, DrizzleModule, RedisModule],
})
export class CoreModule {}
