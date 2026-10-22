import { DomainError } from '@/shared/types/domain.error';

/**
 * Raised when the acting client is not the owner of the consultation.
 */
export class ConsultationNotOwnerError extends DomainError {
  readonly code = 'CONSULTATION_NOT_OWNER';
  readonly message = 'Only the client who owns this consultation can change its mode';
  readonly httpStatus = 403;
  readonly consultationId: number;

  constructor(consultationId: number) {
    super();
    this.consultationId = consultationId;
  }
}
