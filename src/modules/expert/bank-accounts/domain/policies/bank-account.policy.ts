import { BankAccount } from '../../infrastructure/entities/bank-account.entity';
import { PrimaryAccountDeletionError } from '../errors/primary-account-deletion.error';
import { BankAccountNotFoundError } from '../errors/bank-account-not-found.error';

export class BankAccountPolicy {
  static ensureAccountExists(account: BankAccount | null | undefined): asserts account is BankAccount {
    if (!account) {
      throw new BankAccountNotFoundError();
    }
  }

  static ensureCanDelete(account: BankAccount) {
    if (account.is_primary) {
      throw new PrimaryAccountDeletionError();
    }
  }
}
