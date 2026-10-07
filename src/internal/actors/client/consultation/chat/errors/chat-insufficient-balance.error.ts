import { DomainError } from '@/shared/types/domain.error';

export class ChatInsufficientBalanceError extends DomainError {
  readonly code = 'CHAT_INSUFFICIENT_BALANCE';
  readonly message =
    'Insufficient funds, please top up your wallet to continue.';
}
