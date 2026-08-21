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
} from './auth-profile-creation.strategy';
import { RoleEnum } from '@/modules/users/infrastructure/enums/Role.enum';

@Injectable()
export class AuthProfileCreationResolver {
  constructor(
    @Inject(AUTH_PROFILE_CREATION_STRATEGIES)
    private readonly strategies: AuthProfileCreationStrategy[],
  ) { }

  async ensureProfile(user: User, queryRunner?: QueryRunner): Promise<void> {
    const userRole = user.role;
    const strategy = this.resolve(userRole);
    await strategy.ensureProfile(user, queryRunner);
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
