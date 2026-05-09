import { Inject, Injectable, InternalServerErrorException } from '@nestjs/common';
import { QueryRunner } from 'typeorm';
import { User } from '@/modules/users/infrastructure/entities/user.entity';
import {
  AUTH_PROFILE_CREATION_STRATEGIES,
  AuthProfileCreationStrategy,
} from './auth-profile-creation.strategy';

@Injectable()
export class AuthProfileCreationResolver {
  constructor(
    @Inject(AUTH_PROFILE_CREATION_STRATEGIES)
    private readonly strategies: AuthProfileCreationStrategy[],
  ) {}

  async ensureProfile(user: User, queryRunner?: QueryRunner): Promise<void> {
    const userRoles = user.roles?.map((r) => r.name.toLowerCase()) || [];
    const strategy = this.resolve(userRoles);
    await strategy.ensureProfile(user, queryRunner);
  }

  private resolve(userRoles: string[]): AuthProfileCreationStrategy {
    const matched = this.strategies.find((strategy) =>
      userRoles.includes(strategy.role.toLowerCase()),
    );

    if (matched) {
      return matched;
    }

    const fallback = this.strategies.find(
      (strategy) => strategy.role.toLowerCase() === 'client',
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
