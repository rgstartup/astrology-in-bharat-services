import 'dotenv/config';

export const REALTIME_NAMESPACE = '/realtime';

/**
 * Same origin allowlist as the HTTP layer (`main.ts`): env-configured
 * frontends plus Vercel previews. Origin-less (non-browser) clients pass.
 */
export const isAllowedRealtimeOrigin = (
  origin: string | undefined,
): boolean => {
  if (!origin) return true;
  const allowedOrigins = [
    process.env.FRONTEND_URL,
    process.env.ADMIN_FRONTEND_URL,
    process.env.ASTROLOGER_FRONTEND_URL,
    process.env.AGENT_FRONTEND_URL,
    process.env.MERCHANT_FRONTEND_URL,
  ].filter(Boolean);
  const isLocalDev =
    process.env.NODE_ENV !== 'production' &&
    /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$/.test(
      origin,
    );

  return (
    allowedOrigins.includes(origin) ||
    isLocalDev ||
    origin.endsWith('.vercel.app')
  );
};

export const REALTIME_CORS_OPTIONS = {
  // Echo the allowed origin (never `*`: browsers reject it on credentialed
  // polling requests, and our clients connect with `withCredentials`).
  origin: (
    origin: string | undefined,
    callback: (err: Error | null, allow?: string | boolean) => void,
  ) => {
    if (isAllowedRealtimeOrigin(origin)) {
      callback(null, origin ?? true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
} as const;

export const REALTIME_GATEWAY_OPTIONS = {
  namespace: REALTIME_NAMESPACE,
  cors: REALTIME_CORS_OPTIONS,
} as const;
