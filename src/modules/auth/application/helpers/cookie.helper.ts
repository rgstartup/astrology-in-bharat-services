import { CookieOptions } from 'express';

const isProd = process.env.NODE_ENV === 'production';

/**
 * Cookie configuration for access tokens
 */
export const getAccessTokenCookieOptions = (): CookieOptions => ({
  httpOnly: false, // Set to false to allow frontend JS to read it
  secure: isProd,
  sameSite: 'lax',
  maxAge: 15 * 60 * 1000, // 15 minutes
  path: '/',
});

/**
 * Cookie configuration for refresh tokens
 */
export const getRefreshTokenCookieOptions = (): CookieOptions => ({
  httpOnly: true,
  secure: isProd,
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/',
});

/**
 * Cookie names used in the application
 */
export const COOKIE_NAMES = {
  ACCESS_TOKEN: 'accessToken',
  REFRESH_TOKEN: 'refreshToken',
} as const;
