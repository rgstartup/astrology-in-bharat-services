import { DomainError } from '@/shared/types/domain.error';

export class ConsultationNotAvailableError extends DomainError {
  readonly code = 'CONSULTATION_NOT_AVAILABLE';
  readonly message: string;
  readonly consultationId: number;

  constructor(consultationId: number, reason: string) {
    super();
    this.consultationId = consultationId;
    this.message = reason;
  }
}
