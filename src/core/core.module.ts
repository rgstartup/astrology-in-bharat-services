import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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
  ],
  exports: [DatabaseModule],
})
export class CoreModule {}
