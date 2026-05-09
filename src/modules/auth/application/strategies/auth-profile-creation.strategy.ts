import { User } from '@/modules/users/infrastructure/entities/user.entity';
import { QueryRunner } from 'typeorm';

export interface AuthProfileCreationStrategy {
  readonly role: string;
  ensureProfile(user: User, queryRunner?: QueryRunner): Promise<void>;
}

export const AUTH_PROFILE_CREATION_STRATEGIES = Symbol(
  'AUTH_PROFILE_CREATION_STRATEGIES',
);
