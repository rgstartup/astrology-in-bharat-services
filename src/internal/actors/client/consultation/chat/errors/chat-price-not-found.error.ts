import { DomainError } from '@/shared/types/domain.error';

export class ChatPriceNotFoundError extends DomainError {
  readonly code = 'CHAT_PRICE_NOT_FOUND';
  readonly message = 'Chat price not configured for this expert';
}
