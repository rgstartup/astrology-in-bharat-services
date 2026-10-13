import { ConsultationModeType } from '../consultation-orchestrator.types';

/**
 * Resume context carried into `onResume`.
 *
 * The orchestrator computes the billing re-anchor (fresh timestamp plus the
 * already-consumed base seconds) so adapters stay free of budget math.
 */
export interface ConsultationResumeContext {
  /** Fresh ISO timestamp anchoring the resumed billing clock. */
  anchorIso: string;
  /** Elapsed billable seconds already consumed before the resume. */
  baseSeconds: number;
}

/**
 * Mode-specific lifecycle hook for a consultation channel.
 *
 * The orchestrator owns shared concerns (DB status, affordability, emits,
 * timers). Adapters own the mode's channel state in Redis: active-mode
 * marker, pause gate, resume anchor, and teardown cleanup.
 */
export interface IConsultationModeAdapter {
  readonly mode: ConsultationModeType;

  /**
   * Called when a consultation session starts (first participant join / start command).
   *
   * @param consultationId - ID of the consultation being started.
   * @param session - Active session row (or empty record when none exists).
   */
  onStart(consultationId: number, session: Record<string, any>): Promise<void>;

  /**
   * Called when billable time pauses (manual or budget hold).
   *
   * @param consultationId - ID of the consultation being paused.
   */
  onPause(consultationId: number): Promise<void>;

  /**
   * Called when consultation resumes after pause or recharge.
   *
   * @param consultationId - ID of the consultation being resumed.
   * @param context - Billing re-anchor (fresh timestamp + consumed base seconds).
   */
  onResume(consultationId: number, context: ConsultationResumeContext): Promise<void>;

  /**
   * Called when consultation ends. Performs mode-specific teardown.
   *
   * @param consultationId - ID of the consultation being ended.
   */
  onEnd(consultationId: number): Promise<void>;
}
