import { DomainError } from '@/shared/types/domain.error';
import { ConsultationStatus } from '@/internal/consultation/enums';

export class ExpertBusyInConsultationError extends DomainError {
  readonly code = 'EXPERT_BUSY_IN_CONSULTATION';
  readonly message: string;
  readonly status: string;

  constructor(status: string) {
    super();
    this.status = status;
    this.message =
      status === ConsultationStatus.ACTIVE
        ? 'This astrologer is currently busy in a consultation. Please try again after some time.'
        : 'This astrologer already has a pending request. Please try again in a few minutes.';
  }
}
