import { EventEmitterModule } from '@nestjs/event-emitter';
import { Global, Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';

@Global()
@Module({
  imports: [DatabaseModule, EventEmitterModule.forRoot()],
  exports: [DatabaseModule],
})
export class CoreModule {}
