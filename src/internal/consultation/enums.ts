/**
 * Shared enums for the redesigned consultation domain (Drizzle-only tables).
 *
 * Values intentionally reuse the legacy vocab where the meaning is identical
 * (`ConsultationType` modes, `ChatSessionStatus`/`CallSessionStatus` session
 * states) so a future data migration can map 1:1.
 */

export enum ConsultationMode {
  CHAT = 'CHAT',
  AUDIO_CALL = 'AUDIO_CALL',
  VIDEO_CALL = 'VIDEO_CALL',
}

/**
 * Lifecycle of the parent consultation (the request/booking aggregate).
 * requested -> accepted -> active -> completed, with terminal
 * cancelled / rejected / missed / expired branches.
 */
export enum ConsultationStatus {
  REQUESTED = 'requested',
  ACCEPTED = 'accepted',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  REJECTED = 'rejected',
  MISSED = 'missed',
  EXPIRED = 'expired',
}

/**
 * Lifecycle of a single connection attempt under a consultation.
 * A consultation may own several sessions (e.g. reconnect after a drop);
 * billable time is accumulated from these rows.
 */
export enum ConsultationSessionStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
}

export enum ConsultationBillingStatus {
  DRAFT = 'draft',
  FINALIZED = 'finalized',
  VOIDED = 'voided',
}

export enum SessionRecordingStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
}
