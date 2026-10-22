import { DomainError } from '@/shared/types/domain.error';

/**
 * Raised when a consultation is in a lifecycle state that cannot continue
 * over chat (completed, cancelled, rejected, expired).
 */
export class ConsultationNotSwitchableError extends DomainError {
  readonly code = 'CONSULTATION_NOT_SWITCHABLE';
  readonly message: string;
  readonly httpStatus = 400;
  readonly consultationId: number;
  readonly currentMode: string;
  readonly currentStatus: string;

  constructor(consultationId: number, currentMode: string, currentStatus: string) {
    super();
    this.consultationId = consultationId;
    this.currentMode = currentMode;
    this.currentStatus = currentStatus;
    this.message = `Consultation ${consultationId} cannot continue over chat while it is ${currentStatus}`;
  }
}
