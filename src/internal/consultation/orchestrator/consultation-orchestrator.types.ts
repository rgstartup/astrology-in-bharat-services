import { ConsultationMode } from '@/internal/consultation/enums';
export type {
  ConsultationResumeContext,
  IConsultationModeAdapter,
} from './adapters/consultation-mode.adapter';

/**
 * Standardized string mode names across client, expert, and backend orchestrator.
 */
export type ConsultationModeType = 'chat' | 'voice' | 'video';

/**
 * Maps external mode string ('chat' | 'voice' | 'video') to internal ConsultationMode enum.
 */
export function toConsultationModeEnum(
  mode: ConsultationModeType,
): ConsultationMode {
  switch (mode) {
    case 'voice':
      return ConsultationMode.VOICE;
    case 'video':
      return ConsultationMode.VIDEO;
    case 'chat':
    default:
      return ConsultationMode.CHAT;
  }
}

/**
 * Maps internal ConsultationMode enum to external mode string ('chat' | 'voice' | 'video').
 */
export function toConsultationModeType(
  mode: ConsultationMode | string,
): ConsultationModeType {
  if (mode === ConsultationMode.VOICE || mode === 'AUDIO_CALL') {
    return 'voice';
  }
  if (mode === ConsultationMode.VIDEO || mode === 'VIDEO_CALL') {
    return 'video';
  }
  return 'chat';
}

/**
 * Authoritative lifecycle state of a consultation.
 */
export type ConsultationLifecycleState =
  | 'requested'
  | 'accepted'
  | 'active'
  | 'paused'
  | 'budget_hold'
  | 'reconnecting'
  | 'completed'
  | 'rejected'
  | 'cancelled'
  | 'expired';

export type LifecycleReason =
  | 'manual'
  | 'insufficient_balance'
  | 'balance_exhausted_timeout'
  | 'dialog_grace_timeout'
  | 'billing_hold'
  | 'client_disconnected'
  | 'expert_disconnected'
  | 'reconnect_timeout'
  | 'request_timeout'
  | 'max_duration_reached'
  | 'system';

/**
 * Command interfaces received from clients/experts.
 */
export interface AcceptConsultationCommand {
  consultationId: number;
  actorId: number;
  actorType: 'expert';
}

export interface RejectConsultationCommand {
  consultationId: number;
  actorId: number;
  actorType: 'expert' | 'client' | 'system';
  reason?: string;
}

export interface RequestConsultationCommand {
  consultationId: number;
  actorId: number;
  actorType: 'client';
  expertId: number;
}

export interface CancelConsultationCommand {
  consultationId: number;
  actorId: number;
  actorType: 'client';
  reason?: string;
}

export interface StartConsultationCommand {
  consultationId: number;
  actorId: number;
  actorType: 'client' | 'expert';
}

export interface PauseConsultationCommand {
  consultationId: number;
  actorId: number;
  actorType: 'client' | 'expert' | 'system';
  reason?: LifecycleReason;
  /**
   * When set, the pause is a cancel-dialog hold: the server arms a grace
   * timer that ENDS the consultation after this many seconds instead of
   * releasing the hold, and the payload carries the grace deadline.
   */
  graceSeconds?: number;
}

export interface ResumeConsultationCommand {
  consultationId: number;
  actorId: number;
  actorType: 'client' | 'expert' | 'system';
  targetMode?: ConsultationModeType;
}

export interface ConsultationResumedAckPayload extends ConsultationStatePayload {
  channelName?: string;
  token?: string;
  tokenExpiresAt?: string;
}

export interface DisconnectConsultationCommand {
  consultationId: number;
  actorId: number;
  actorType: 'client' | 'expert';
}

export interface CloseConsultationCommand {
  consultationId: number;
  actorId: number;
  actorType: 'expert';
  reason?: string;
}

export interface EndConsultationCommand {
  consultationId: number;
  actorId: number;
  actorType: 'client' | 'expert' | 'system';
  reason?: LifecycleReason | string;
}

/**
 * Moves a voice/video consultation over to chat.
 */
export interface SwitchToChatCommand {
  consultationId: number;
  actorId: number;
  actorType: 'client';
}

/**
 * Media control command interfaces for active voice/video consultations.
 */
export interface MediaControlCommand {
  consultationId: number;
  actorId: number;
  actorType: 'client' | 'expert';
}

/**
 * Grace window the server grants while the client keeps the cancel dialog
 * open (pauseTimer intent 'cancel_dialog'). After it lapses the server ends
 * the consultation itself.
 */
export const CANCEL_DIALOG_GRACE_SECONDS = 30;

export interface MuteMicCommand extends MediaControlCommand {}
export interface UnmuteMicCommand extends MediaControlCommand {}
export interface MuteSpeakerCommand extends MediaControlCommand {}
export interface UnmuteSpeakerCommand extends MediaControlCommand {}
export interface PauseTimerCommand extends MediaControlCommand {}
export interface ResumeTimerCommand extends MediaControlCommand {}
export interface SwitchCameraCommand extends MediaControlCommand {
  cameraId?: string;
}

/**
 * Media control event payloads broadcast to consultation room.
 */
export interface MediaControlPayload {
  consultationId: number;
  actorType: 'client' | 'expert';
  actorId: number;
  timestamp: string;
}

export interface MicMutedPayload extends MediaControlPayload {}
export interface MicUnmutedPayload extends MediaControlPayload {}
export interface SpeakerMutedPayload extends MediaControlPayload {}
export interface SpeakerUnmutedPayload extends MediaControlPayload {}
export interface TimerPausedPayload extends MediaControlPayload {
  reason?: LifecycleReason;
}
export interface TimerResumedPayload extends MediaControlPayload {}
export interface CameraSwitchedPayload extends MediaControlPayload {
  cameraId?: string;
}

/**
 * Outbound Event Payloads.
 */
export interface ConsultationMediaReadyPayload {
  consultationId: number;
  actorType: 'client' | 'expert';
  actorId: number;
  clientReady: boolean;
  expertReady: boolean;
  bothReady: boolean;
  timestamp: string;
}
export interface ConsultationStatePayload {
  consultationId: number;
  sessionId?: number;
  mode: ConsultationModeType;
  state: ConsultationLifecycleState;
  reason?: LifecycleReason | string | null;
  startedAt?: string | null;
  elapsedSeconds: number;
  remainingSeconds?: number;
  maxMinutes: number;
  ratePerMinute: number;
  pauseExpiresInSec?: number;
  /** ISO deadline after which the consultation auto-ends (cancel-dialog grace). */
  graceDeadline?: string;
  graceDurationSeconds?: number;
  consumedAmount?: number;
  timestamp: string;
}

export interface ConsultationBudgetHoldPayload {
  consultationId: number;
  sessionId?: number;
  mode: ConsultationModeType;
  state: 'budget_hold';
  reason: 'insufficient_balance';
  graceDeadline: string;
  graceDurationSeconds: number;
  rechargeRequired?: boolean;
  minRechargeAmount?: number;
  waitingForClient?: boolean;
  timestamp: string;
}

export interface ConsultationBudgetTickPayload {
  consultationId: number;
  sessionId?: number;
  mode: ConsultationModeType;
  remainingSeconds: number;
  elapsedSeconds: number;
  maxMinutes: number;
  ratePerMinute: number;
  timestamp: string;
  startedAt?: string;
  baseSeconds?: number;
}

export interface ConsultationBudgetWarningPayload {
  consultationId: number;
  sessionId?: number;
  mode: ConsultationModeType;
  remainingSeconds: number;
  message?: string;
  timestamp: string;
}

export interface ConsultationEndedPayload {
  consultationId: number;
  sessionId?: number;
  mode: ConsultationModeType;
  endedBy: string;
  reason: LifecycleReason | string;
  totalDurationSeconds: number;
  timestamp: string;
}
