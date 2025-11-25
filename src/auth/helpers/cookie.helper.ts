import { CookieOptions } from 'express';

/**
 * Cookie configuration for access tokens
 * - HttpOnly: Prevents XSS attacks
 * - Secure: Only sent over HTTPS in production
 * - SameSite: Prevents CSRF attacks
 * - MaxAge: 15 minutes
 */
export const getAccessTokenCookieOptions = (): CookieOptions => ({
  httpOnly: true,
  secure: true,
  sameSite: 'lax',
  maxAge: 15 * 60 * 1000, // 15 minutes
});

/**
 * Cookie configuration for refresh tokens
 * - HttpOnly: Prevents XSS attacks
 * - Secure: Only sent over HTTPS in production
 * - SameSite: Prevents CSRF attacks
 * - MaxAge: 7 days
 */
export const getRefreshTokenCookieOptions = (): CookieOptions => ({
  httpOnly: true,
  secure: true,
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
});

/**
 * Cookie names used in the application
 */
export const COOKIE_NAMES = {
  ACCESS_TOKEN: 'accessToken',
  REFRESH_TOKEN: 'refreshToken',
} as const;
