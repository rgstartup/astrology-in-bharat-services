import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Redis, RedisOptions } from 'ioredis';
import { RedisConfig } from '@/config/redis.config';
import { REDIS_CLIENT, REDIS_SUBSCRIBER_CLIENT } from './redis.constants';
import { RedisService } from './redis.service';

function createRedisOptions(config: ConfigService): RedisOptions {
  const redisConfig = config.get<RedisConfig>('redis');
  return {
    host: redisConfig?.host || '127.0.0.1',
    port: redisConfig?.port || 6379,
    password: redisConfig?.password || undefined,
    username: redisConfig?.username || undefined,
    tls: redisConfig?.tls,
    retryStrategy(times) {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
  };
}

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: (config: ConfigService) => {
        return new Redis(createRedisOptions(config));
      },
      inject: [ConfigService],
    },
    {
      provide: REDIS_SUBSCRIBER_CLIENT,
      useFactory: (config: ConfigService) => {
        return new Redis(createRedisOptions(config));
      },
      inject: [ConfigService],
    },
    RedisService,
  ],
  exports: [REDIS_CLIENT, REDIS_SUBSCRIBER_CLIENT, RedisService],
})
export class RedisModule {}
