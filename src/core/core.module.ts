import { EventEmitterModule } from '@nestjs/event-emitter';
import { Global, Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { JwtModule } from './jwt/jwt.module';

@Global()
@Module({
  imports: [DatabaseModule, JwtModule, EventEmitterModule.forRoot()],
  exports: [DatabaseModule],
})
export class CoreModule {}
