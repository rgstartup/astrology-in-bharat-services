import { ExpertAccount } from '@/modules/expert/account/entities/account.entity';
import { ProfileNotFoundError } from '../errors/profile-not-found.error';

export class DashboardPolicy {
  static ensureProfileExists(
    account: ExpertAccount | null,
  ): asserts account is ExpertAccount {
    if (!account) {
      throw new ProfileNotFoundError();
    }
  }
}
