import { DomainError } from '@/shared/types/domain.error';
import { HttpStatus } from '@nestjs/common';

/**
 * Thrown when the `details` JSONB payload does not contain the required
 * keys for the given `account_type` (bank_account: account_number_masked/bank_name/ifsc;
 * vpa: vpa_id; wallet: wallet_handle; card: last4/brand).
 */
export class InvalidPayoutAccountDetailsError extends DomainError {
  readonly code = 'PAYOUT_ACCOUNT_INVALID_DETAILS';
  readonly message: string;
  readonly httpStatus = HttpStatus.UNPROCESSABLE_ENTITY;

  constructor(readonly accountType: string, readonly missing: string[]) {
    super();
    this.message = `Invalid payout account details for type '${accountType}': missing required field(s): ${missing.join(', ')}`;
  }
}
