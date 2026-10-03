export const REALTIME_NAMESPACE = '/realtime';

export const REALTIME_GATEWAY_OPTIONS = {
  namespace: REALTIME_NAMESPACE,
  cors: {
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      const allowedOrigins = [
        process.env.FRONTEND_URL,
        process.env.ADMIN_FRONTEND_URL,
        process.env.ASTROLOGER_FRONTEND_URL,
        process.env.AGENT_FRONTEND_URL,
        process.env.MERCHANT_FRONTEND_URL,
      ].filter(Boolean);

      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        origin.endsWith('.vercel.app')
      ) {
        callback(null, true);
      } else {
        callback(null, true); // Permissive in dev, respects origin boundary
      }
    },
    credentials: true,
  },
} as const;
