import { registerAs } from '@nestjs/config';

export interface AuthConfig {
  betterAuthUrl: string;
}

export default registerAs(
  'auth',
  (): AuthConfig => ({
    betterAuthUrl: process.env.BETTER_AUTH_URL || 'http://localhost:3001',
  }),
);
