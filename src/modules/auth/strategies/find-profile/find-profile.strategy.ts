import { RoleEnum } from '@/modules/users/enums/Role.enum';

export interface IFindProfileStrategy {
  supports(role: RoleEnum): boolean;
  findProfile(userId: string): Promise<string | null>;
}

export const FIND_PROFILE_STRATEGIES = Symbol('FIND_PROFILE_STRATEGIES');
