// src/config/auth.config.ts
import { registerAs } from '@nestjs/config';

export interface AuthConfig {
  jwtSecret: string;
  jwtExpiresIn: string;
  refreshTokenExpiresIn: string;
  googleClientId: string;
  googleClientSecret: string;
  googleCallbackUrl: string;
  frontendUrl: string;
  adminFrontendUrl: string;
  astrologerFrontendUrl: string;
}

export default registerAs(
  'auth',
  (): AuthConfig => ({
    jwtSecret: process.env.JWT_SECRET || 'supersecret',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
    googleClientId: process.env.GOOGLE_CLIENT_ID || '',
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    googleCallbackUrl:
      process.env.GOOGLE_CALLBACK_URL ||
      'http://localhost:4000/api/v1/auth/google/callback',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
    adminFrontendUrl: process.env.ADMIN_FRONTEND_URL || 'http://localhost:3001',
    astrologerFrontendUrl:
      process.env.ASTROLOGER_FRONTEND_URL || 'http://localhost:3003',
  }),
);
