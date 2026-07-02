import { registerAs } from '@nestjs/config';

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  username?: string;
  tls?: any;
}

export default registerAs('redis', (): RedisConfig => {
  let host = process.env.REDIS_HOST || '127.0.0.1';
  let port = parseInt(process.env.REDIS_PORT || '6379', 10);
  let password = process.env.REDIS_PASSWORD;
  let username = process.env.REDIS_USERNAME;
  let tls: any = process.env.REDIS_TLS === 'true' ? {} : undefined;

  if (process.env.REDIS_URL) {
    try {
      const u = new URL(process.env.REDIS_URL);
      host = u.hostname;
      port = parseInt(u.port, 10) || (u.protocol === 'rediss:' ? 6379 : 6379);
      if (u.password) password = decodeURIComponent(u.password);
      if (u.username) username = decodeURIComponent(u.username);
      if (u.protocol === 'rediss:') tls = {};
    } catch (e) {
      console.warn('Failed to parse REDIS_URL', e);
    }
  }

  return {
    host,
    port,
    password,
    username,
    tls,
  };
});
