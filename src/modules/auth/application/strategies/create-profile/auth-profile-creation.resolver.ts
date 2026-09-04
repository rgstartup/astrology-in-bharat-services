import {
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { QueryRunner } from 'typeorm';
import { User } from '@/modules/users/infrastructure/entities/user.entity';
import {
  AUTH_PROFILE_CREATION_STRATEGIES,
  AuthProfileCreationStrategy,
  RoleProfileMap,
} from './auth-profile-creation.strategy';
import { RoleEnum } from '@/modules/users/infrastructure/enums/Role.enum';

@Injectable()
export class AuthProfileCreationResolver {
  constructor(
    @Inject(AUTH_PROFILE_CREATION_STRATEGIES)
    private readonly strategies: AuthProfileCreationStrategy[],
  ) { }

  async ensureProfile<R extends RoleEnum = RoleEnum>(
    user: User & { role?: R },
    queryRunner?: QueryRunner,
  ): Promise<RoleProfileMap[R]> {
    const userRole = user.role || RoleEnum.CLIENT;
    const strategy = this.resolve(userRole);
    return strategy.ensureProfile(user, queryRunner) as Promise<RoleProfileMap[R]>;
  }

  private resolve(userRole: RoleEnum): AuthProfileCreationStrategy {
    const matched = this.strategies.find((strategy) =>
      userRole === strategy.role,
    );

    if (matched) {
      return matched;
    }

    const fallback = this.strategies.find(
      (strategy) => strategy.role === RoleEnum.CLIENT,
    );

    if (fallback) {
      return fallback;
    }

    if (this.strategies.length === 0) {
      throw new InternalServerErrorException(
        'No auth profile creation strategies configured',
      );
    }

    return this.strategies[0];
  }
}
