import { ProfileClient } from '../../infrastructure/entities/profile-client.entity';
import { ProfileNotFoundError } from '../errors/profile-not-found.error';

export class ProfilePolicy {
  static ensureProfileExists(profile: ProfileClient | null | undefined): asserts profile is ProfileClient {
    if (!profile) {
      throw new ProfileNotFoundError();
    }
  }
}
