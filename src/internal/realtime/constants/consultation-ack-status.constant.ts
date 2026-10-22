/** Ack `status` values for the shared consultation meter (pause/resume/join/send) — mirrored in frontend `realtime/types/chat.ts`. */
export const CONSULTATION_ACK_STATUS = {
  JOINED: 'joined',
  LEFT: 'left',
  SENT: 'sent',
  REQUESTED: 'requested',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
  ENDED: 'ended',
  IGNORED: 'ignored',
  TOKEN: 'token',
  PAUSED: 'paused',
  RESUMED: 'resumed',
} as const;

export type ConsultationAckStatus =
  (typeof CONSULTATION_ACK_STATUS)[keyof typeof CONSULTATION_ACK_STATUS];
