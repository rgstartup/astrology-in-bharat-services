import { DomainError } from '@/shared/types/domain.error';

/**
 * Raised when a consultation is asked to switch to chat while it already runs
 * in chat mode.
 */
export class ConsultationAlreadyInChatModeError extends DomainError {
  readonly code = 'CONSULTATION_ALREADY_IN_CHAT_MODE';
  readonly message = 'This consultation is already running over chat';
  readonly httpStatus = 400;
  readonly consultationId: number;
  readonly currentMode: string;

  constructor(consultationId: number, currentMode: string) {
    super();
    this.consultationId = consultationId;
    this.currentMode = currentMode;
  }
}
