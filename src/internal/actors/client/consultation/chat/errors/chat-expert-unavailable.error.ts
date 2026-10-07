import { DomainError } from '@/shared/types/domain.error';

export class ChatExpertUnavailableError extends DomainError {
  readonly code = 'CHAT_EXPERT_UNAVAILABLE';
  readonly message =
    'Expert is currently offline and not accepting chat requests at the moment.';
}
