import type { DeferredDependency } from '../../../shared/types/deferred-dependency.type';
import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { UsersService } from '../../users/users.service';

@Injectable()
export class GetAdminUserGrowthStatsUseCase {
  constructor(
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: DeferredDependency<UsersService>,
  ) {}

  async execute(days: number = 7) {
    return this.usersService.getUserExpertGrowthStats(days);
  }
}
