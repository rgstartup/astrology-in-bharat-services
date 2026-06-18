import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { ExternalModule } from '@/external/external.module';
import { EmailProcessor } from './application/email.processor';
import { RedisConfig } from '@/config/redis.config';
import configs from '@/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: configs,
    }),
    ExternalModule, // Brings in NodeMailerService
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisConfig = configService.get<RedisConfig>('redis');
        return {
          connection: {
            host: redisConfig?.host || 'localhost',
            port: redisConfig?.port || 6379,
            password: redisConfig?.password,
            username: redisConfig?.username,
            tls: redisConfig?.tls,
          },
        };
      },
    }),
  ],
  providers: [EmailProcessor],
})
export class EmailWorkerModule {}
