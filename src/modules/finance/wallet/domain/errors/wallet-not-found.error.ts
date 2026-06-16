import { DomainError } from '@/common/types/domain.error';
import { HttpStatus } from '@nestjs/common';

export class WalletNotFoundError extends DomainError {
  readonly code = 'WALLET_NOT_FOUND';
  readonly httpStatus = HttpStatus.NOT_FOUND;
  readonly message = 'Wallet not found';
}
