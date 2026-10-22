import { DomainError } from '@/shared/types/domain.error';

/**
 * Raised when the consultation row referenced by a command does not exist.
 */
export class ConsultationNotFoundError extends DomainError {
  readonly code = 'CONSULTATION_NOT_FOUND';
  readonly message: string;
  readonly httpStatus = 404;
  readonly consultationId: number;

  constructor(consultationId: number) {
    super();
    this.consultationId = consultationId;
    this.message = `Consultation ${consultationId} was not found`;
  }
}
