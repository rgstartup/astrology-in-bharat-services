
import { ProfileExpert } from '@/modules/expert/profile/infrastructure/persistence/entities/profile-expert.entity';
import { ProfileNotFoundError } from '../errors/profile-not-found.error';

export class DashboardPolicy {
  static ensureProfileExists(profile: ProfileExpert | null): asserts profile is ProfileExpert {
    if (!profile) {
      throw new ProfileNotFoundError();
    }
  }
}
