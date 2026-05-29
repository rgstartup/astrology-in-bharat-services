import { User } from '@/modules/users/infrastructure/entities/user.entity';
import { RoleEnum } from '@/modules/users/infrastructure/enums/Role.enum';
import { QueryRunner } from 'typeorm';

export interface AuthProfileCreationStrategy {
  readonly role: RoleEnum;
  ensureProfile(user: User, queryRunner?: QueryRunner): Promise<void>;
}

export const AUTH_PROFILE_CREATION_STRATEGIES = Symbol(
  'AUTH_PROFILE_CREATION_STRATEGIES',
);
