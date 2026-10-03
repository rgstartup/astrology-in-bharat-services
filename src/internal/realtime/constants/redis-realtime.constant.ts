export const REDIS_KEYS = {
  presence: {
    expertConnections: (expertId: string | number) =>
      `presence:expert:${expertId}:connections`,
    connection: (connectionId: string) =>
      `presence:connection:${connectionId}`,
    consultation: (expertId: string | number) =>
      `presence:expert:${expertId}:consultation`,
    availability: (expertId: string | number) =>
      `presence:expert:${expertId}:availability`,
    lastStatus: (expertId: string | number) =>
      `presence:expert:${expertId}:last_status`,
  },
  chat: {
    session: (sessionId: string | number) =>
      `chat:session:${sessionId}`,
    activeClient: (clientId: string | number) =>
      `chat:client:${clientId}:active`,
    activeExpert: (expertId: string | number) =>
      `chat:expert:${expertId}:active`,
  },
  call: {
    session: (sessionId: string | number) =>
      `call:session:${sessionId}`,
    activeClient: (clientId: string | number) =>
      `call:client:${clientId}:active`,
    activeExpert: (expertId: string | number) =>
      `call:expert:${expertId}:active`,
  },
  notification: {
    clientUnreadCount: (clientId: string | number) =>
      `notification:client:${clientId}:unread_count`,
    expertUnreadCount: (expertId: string | number) =>
      `notification:expert:${expertId}:unread_count`,
  },
} as const;

export const REDIS_CHANNELS = {
  PRESENCE_EVENTS: 'presence:events',
  CHAT_EVENTS: 'chat:events',
  CALL_EVENTS: 'call:events',
  NOTIFICATION_EVENTS: 'notification:events',
} as const;
