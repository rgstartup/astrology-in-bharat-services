import { ConsultationMode } from '@/internal/consultation/enums';
export type { IConsultationModeAdapter } from './adapters/consultation-mode.adapter';

/**
 * Standardized string mode names across client, expert, and backend orchestrator.
 */
export type ConsultationModeType = 'chat' | 'voice' | 'video';

/**
 * Maps external mode string ('chat' | 'voice' | 'video') to internal ConsultationMode enum.
 */
export function toConsultationModeEnum(mode: ConsultationModeType): ConsultationMode {
  switch (mode) {
    case 'voice':
      return ConsultationMode.AUDIO_CALL;
    case 'video':
      return ConsultationMode.VIDEO_CALL;
    case 'chat':
    default:
      return ConsultationMode.CHAT;
  }
}

/**
 * Maps internal ConsultationMode enum to external mode string ('chat' | 'voice' | 'video').
 */
export function toConsultationModeType(mode: ConsultationMode | string): ConsultationModeType {
  if (mode === ConsultationMode.AUDIO_CALL || mode === 'voice' || mode === 'AUDIO_CALL') {
    return 'voice';
  }
  if (mode === ConsultationMode.VIDEO_CALL || mode === 'video' || mode === 'VIDEO_CALL') {
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
}

export interface ResumeConsultationCommand {
  consultationId: number;
  actorId: number;
  actorType: 'client' | 'expert';
}

export interface DisconnectConsultationCommand {
  consultationId: number;
  actorId: number;
  actorType: 'client' | 'expert';
}

export interface EndConsultationCommand {
  consultationId: number;
  actorId: number;
  actorType: 'client' | 'expert' | 'system';
  reason?: LifecycleReason | string;
}

/**
 * Outbound Event Payloads.
 */
export interface ConsultationStatePayload {
  consultationId: number;
  mode: ConsultationModeType;
  state: ConsultationLifecycleState;
  reason?: LifecycleReason | string | null;
  startedAt?: string | null;
  elapsedSeconds: number;
  remainingSeconds?: number;
  maxMinutes: number;
  ratePerMinute: number;
  pauseExpiresInSec?: number;
  consumedAmount?: number;
  timestamp: string;
}

export interface ConsultationBudgetHoldPayload {
  consultationId: number;
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
  mode: ConsultationModeType;
  remainingSeconds: number;
  elapsedSeconds: number;
  maxMinutes: number;
  ratePerMinute: number;
  timestamp: string;
}

export interface ConsultationBudgetWarningPayload {
  consultationId: number;
  mode: ConsultationModeType;
  remainingSeconds: number;
  message?: string;
  timestamp: string;
}

export interface ConsultationEndedPayload {
  consultationId: number;
  mode: ConsultationModeType;
  endedBy: string;
  reason: LifecycleReason | string;
  totalDurationSeconds: number;
  timestamp: string;
}
