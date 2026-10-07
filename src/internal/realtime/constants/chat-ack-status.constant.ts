/** Ack `status` values for chat handshake + messaging (mirrored in frontend `realtime/types/chat.ts`). */
export const CHAT_ACK_STATUS = {
  JOINED: 'joined',
  LEFT: 'left',
  SENT: 'sent',
  REQUESTED: 'requested',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  IGNORED: 'ignored',
} as const;

export type ChatAckStatus =
  (typeof CHAT_ACK_STATUS)[keyof typeof CHAT_ACK_STATUS];
