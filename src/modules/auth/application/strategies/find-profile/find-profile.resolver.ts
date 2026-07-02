import { Injectable, Inject } from '@nestjs/common';
import { RoleEnum } from '@/modules/users/infrastructure/enums/Role.enum';
import {
  IFindProfileStrategy,
  FIND_PROFILE_STRATEGIES,
} from './find-profile.strategy';

@Injectable()
export class FindProfileResolver {
  constructor(
    @Inject(FIND_PROFILE_STRATEGIES)
    private readonly strategies: IFindProfileStrategy[],
  ) {}

  async findProfile(
    userId: string,
    targetRole: RoleEnum,
  ): Promise<string | null> {
    const strategy = this.strategies.find((s) => s.supports(targetRole));
    if (!strategy) {
      return null;
    }
    return strategy.findProfile(userId);
  }
}
