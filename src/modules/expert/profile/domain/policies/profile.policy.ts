import { ProfileExpert } from '../../infrastructure/entities/profile-expert.entity';
import { ProfileNotFoundError } from '../errors/profile-not-found.error';
import { KycAlreadyVerifiedError } from '../errors/kyc-already-verified.error';

export class ProfilePolicy {
  static ensureProfileExists(
    profile: ProfileExpert | null | undefined,
  ): asserts profile is ProfileExpert {
    if (!profile) {
      throw new ProfileNotFoundError();
    }
  }

  static ensureCanVerifyKyc(profile: ProfileExpert) {
    if (profile.kyc_status === 'verified') {
      throw new KycAlreadyVerifiedError();
    }
  }
}
