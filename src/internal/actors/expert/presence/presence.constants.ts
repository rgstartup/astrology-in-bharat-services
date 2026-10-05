export const PRESENCE_HEARTBEAT_INTERVAL = 30; // seconds
export const PRESENCE_TTL = 90; // seconds

/** Busy marker expiry: bounds stale `busy` after a crash without `setIdle`. */
export const PRESENCE_CONSULTATION_TTL = 4 * 3600; // seconds
/** Dedupe marker expiry: bounds cold-key memory to experts seen in last 24h. */
export const PRESENCE_LAST_STATUS_TTL = 24 * 3600; // seconds

export const PRESENCE_PUBSUB_CHANNEL = 'presence:events';
export const PRESENCE_EVENT_NAME = 'expert.presence.changed';

export const PRESENCE_KEYS = {
  expertConnections: (expertId: number | string) =>
    `presence:expert:${expertId}:connections`,
  connection: (connectionId: string) => `presence:connection:${connectionId}`,
  expertConsultation: (expertId: number | string) =>
    `presence:expert:${expertId}:consultation`,
  expertLastStatus: (expertId: number | string) =>
    `presence:expert:${expertId}:last_status`,
} as const;
