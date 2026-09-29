import type { DeferredDependency } from '@/shared/types/deferred-dependency.type';
import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { UsersService } from '@/internal/users/users.service';
import { FilterCriteria } from '@/internal/users/use-cases/get-filtered-users.use-case';

export { type FilterCriteria };

@Injectable()
export class GetFilteredUsersUseCase {
  constructor(
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: DeferredDependency<UsersService>,
  ) {}

  async executeCount(filters: FilterCriteria) {
    return this.usersService.getFilteredUsersCount(filters);
  }

  async executeList(filters: FilterCriteria) {
    return this.usersService.getFilteredUsersList(filters);
  }
}
