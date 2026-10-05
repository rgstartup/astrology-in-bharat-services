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
  return allowedOrigins.includes(origin) || origin.endsWith('.vercel.app');
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
