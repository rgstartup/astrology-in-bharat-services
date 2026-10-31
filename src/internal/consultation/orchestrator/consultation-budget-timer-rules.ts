import { ConsultationStatus } from '@/internal/consultation/enums';
import type { ConsultationModeType } from './consultation-orchestrator.types';

/**
 * Context passed to every budget-timer rule. The service prepares it once
 * (one Redis read for media readiness) so rules stay pure and cheap.
 */
export interface BudgetTimerRuleContext {
  consultationId: number;
  mode: ConsultationModeType;
  status: ConsultationStatus;
  bothMediaReady: boolean;
  startedAt?: string | null;
}

/**
 * A single gate on starting the metered budget timer. `start()` arms the
 * timer only when every rule returns `true`; the first failure short-circuits
 * and returns its reason. Rules are append-only per mode — adding a new
 * gate never touches `start()` or its callers.
 */
export interface BudgetTimerRule {
  name: string;
  evaluate(ctx: BudgetTimerRuleContext): boolean | Promise<boolean>;
  reason: string;
}

/**
 * Gate: the consultation must already be ACTIVE (ACCEPTED -> ACTIVE flip
 * happens in the start use case). Without this, billing cannot start on a
 * consultation that hasn't been accepted yet.
 */
export const statusIsActiveRule: BudgetTimerRule = {
  name: 'statusIsActive',
  reason: 'consultation is not active',
  evaluate: (ctx) => ctx.status === ConsultationStatus.ACTIVE,
};

/**
 * Gate: both client and expert must have reported media-ready (inside Agora)
 * for voice/video. Chat does not require this — billing starts on both-joined
 * socket room instead.
 */
export const bothMediaReadyRule: BudgetTimerRule = {
  name: 'bothMediaReady',
  reason: 'both parties are not yet media-ready',
  evaluate: (ctx) => ctx.bothMediaReady,
};

/**
 * Append-only mode -> rules mapping. `start()` looks rules up by the mode
 * returned from the start use case; it never branches on mode itself.
 */
export const BUDGET_TIMER_RULES_BY_MODE: Record<
  ConsultationModeType,
  BudgetTimerRule[]
> = {
  chat: [statusIsActiveRule],
  voice: [statusIsActiveRule, bothMediaReadyRule],
  video: [statusIsActiveRule, bothMediaReadyRule],
};
