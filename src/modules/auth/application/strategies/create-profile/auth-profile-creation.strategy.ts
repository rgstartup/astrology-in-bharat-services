import { User } from '@/modules/users/infrastructure/entities/user.entity';
import { RoleEnum } from '@/modules/users/infrastructure/enums/Role.enum';
import { ClientAccount } from '@/modules/client/account/entities/account.entity';
import { ProfileExpert } from '@/modules/expert/profile/infrastructure/entities/profile-expert.entity';
import { ProfileMerchant } from '@/modules/merchant/profile/infrastructure/entities/profile-merchant.entity';
import { ProfileAgent } from '@/modules/agent/infrastructure/entities/profile-agent.entity';
import { QueryRunner } from 'typeorm';

// 1. Role to Profile Mapping
export interface RoleProfileMap {
  [RoleEnum.CLIENT]: ClientAccount;
  [RoleEnum.EXPERT]: ProfileExpert;
  [RoleEnum.MERCHANT]: ProfileMerchant;
  [RoleEnum.AGENT]: ProfileAgent;
  [RoleEnum.ADMIN]: null;
  [RoleEnum.SUPER_ADMIN]: null;
  [RoleEnum.SUB_ADMIN]: null;
}

export type AnyProfile = RoleProfileMap[RoleEnum];

// 2. Generic Strategy Interface
export interface AuthProfileCreationStrategy<TProfile = AnyProfile> {
  readonly role: RoleEnum;
  ensureProfile(user: User, queryRunner?: QueryRunner): Promise<TProfile>;
}

export const AUTH_PROFILE_CREATION_STRATEGIES = Symbol(
  'AUTH_PROFILE_CREATION_STRATEGIES',
);
