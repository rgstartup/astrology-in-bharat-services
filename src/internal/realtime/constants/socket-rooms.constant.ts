export const SOCKET_ROOMS = {
  CLIENT: (clientId: string | number) => `client:${clientId}`,
  EXPERT: (expertId: string | number) => `expert:${expertId}`,
  EXPERT_PRESENCE: (expertId: string | number) => `presence:expert:${expertId}`,
  CONSULTATION: (consultationId: string | number) =>
    `consultation:${consultationId}`,
  /**
   * Media channel both voice participants join. Scoped to the consultation
   * (not the session) so a resumed session rejoins the same Agora channel.
   */
  VOICE_SESSION: (consultationId: string | number) =>
    `consultation:voice:${consultationId}`,
  GLOBAL_NOTIFICATIONS: () => 'notifications:global',
} as const;
