export const PRESENCE_HEARTBEAT_INTERVAL = 10; // seconds
export const PRESENCE_TTL = 30; // seconds

export const PRESENCE_PUBSUB_CHANNEL = 'presence:events';
export const PRESENCE_EVENT_NAME = 'expert.presence.changed';

export const PRESENCE_KEYS = {
  expertConnections: (expertId: number | string) =>
    `presence:expert:${expertId}:connections`,
  connection: (connectionId: string) => `presence:connection:${connectionId}`,
  expertConsultation: (expertId: number | string) =>
    `presence:expert:${expertId}:consultation`,
  expertAvailability: (expertId: number | string) =>
    `presence:expert:${expertId}:availability`,
  expertLastStatus: (expertId: number | string) =>
    `presence:expert:${expertId}:last_status`,
} as const;
