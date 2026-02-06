import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import configs from './config';
import { DatabaseModule } from './database/database.module';
import { JwtModule } from './jwt/jwt.module';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: configs,
    }),
    DatabaseModule,
    JwtModule,
    EventEmitterModule.forRoot(),
  ],
  exports: [DatabaseModule],
})
export class CoreModule {}
