export const SOCKET_ROOMS = {
  CLIENT: (clientId: string | number) => `client:${clientId}`,
  EXPERT: (expertId: string | number) => `expert:${expertId}`,
  EXPERT_PRESENCE: (expertId: string | number) => `presence:expert:${expertId}`,
  CONSULTATION: (consultationId: string | number) => `consultation:${consultationId}`,
  CHAT_SESSION: (sessionId: string | number) => `chat:${sessionId}`,
  CALL_SESSION: (sessionId: string | number) => `call:${sessionId}`,
  GLOBAL_NOTIFICATIONS: () => 'notifications:global',
} as const;
