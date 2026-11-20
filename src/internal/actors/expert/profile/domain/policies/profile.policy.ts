import { ProfileExpert } from '../../entities/profile-expert.entity';
import { ProfileNotFoundError } from '../errors/profile-not-found.error';

export class ProfilePolicy {
  static ensureProfileExists(
    profile: ProfileExpert | null | undefined,
  ): asserts profile is ProfileExpert {
    if (!profile) {
      throw new ProfileNotFoundError();
    }
  }
}
