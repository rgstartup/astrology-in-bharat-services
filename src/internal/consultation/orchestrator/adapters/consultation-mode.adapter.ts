import { ConsultationModeType } from '../consultation-orchestrator.types';

export interface IConsultationModeAdapter {
  readonly mode: ConsultationModeType;

  /**
   * Called when a consultation session starts (first participant join / start command).
   */
  onStart(consultationId: number, session: Record<string, any>): Promise<void>;

  /**
   * Called when billable time pauses (manual or budget hold).
   */
  onPause(consultationId: number): Promise<void>;

  /**
   * Called when consultation resumes after pause or recharge.
   */
  onResume(consultationId: number): Promise<void>;

  /**
   * Called when consultation ends. Performs mode-specific teardown.
   */
  onEnd(consultationId: number): Promise<void>;
}
