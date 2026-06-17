import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { NodemailerModule } from '@/external/nodemailer/nodemailer.module';
import { EmailProcessor } from './application/email.processor';
import { RedisConfig } from '@/config/redis.config';
import configs from '@/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: configs,
    }),
    NodemailerModule, // Only what EmailProcessor actually needs
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
