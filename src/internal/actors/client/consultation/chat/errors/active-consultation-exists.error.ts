import { DomainError } from '@/shared/types/domain.error';
import { ConsultationStatus } from '@/internal/consultation/enums';

export class ActiveConsultationExistsError extends DomainError {
  readonly code = 'ACTIVE_CONSULTATION_EXISTS';
  readonly message: string;
  readonly existingConsultationId: number;
  readonly existingExpertId: number;
  readonly existingStatus: string;

  constructor(existing: {
    id: number;
    expert_id: number;
    status: string;
  }) {
    super();
    this.existingConsultationId = existing.id;
    this.existingExpertId = existing.expert_id;
    this.existingStatus = existing.status;
    this.message =
      existing.status === ConsultationStatus.ACTIVE
        ? 'You already have an ongoing chat session with another astrologer. ' +
          'Please end it before starting a new one.'
        : 'You already have a pending chat request with another astrologer. ' +
          'Please wait for it to expire or cancel it first.';
  }
}
