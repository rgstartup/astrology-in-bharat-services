import { CookieOptions } from 'express';

const isProd = process.env.NODE_ENV === 'production';

/**
 * Cookie configuration for access tokens
 */
export const getAccessTokenCookieOptions = (): CookieOptions => ({
  httpOnly: true, // Only backend can read (more secure)
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

/**
 * Separate cookie names for Agent — avoids collision with user cookies
 */
export const AGENT_COOKIE_NAMES = {
  ACCESS_TOKEN: 'agentAccessToken',
  REFRESH_TOKEN: 'agentRefreshToken',
} as const;

/**
 * Separate cookie names for Admin
 */
export const ADMIN_COOKIE_NAMES = {
  ACCESS_TOKEN: 'adminAccessToken',
  REFRESH_TOKEN: 'adminRefreshToken',
} as const;
