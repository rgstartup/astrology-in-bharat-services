import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { UsersFacade } from '@/modules/users/application/users.facade';
import { FilterCriteria } from '@/modules/users/application/use-cases/get-filtered-users.use-case';

export { FilterCriteria };

@Injectable()
export class GetFilteredUsersUseCase {
  constructor(
    @Inject(forwardRef(() => UsersFacade))
    private readonly usersFacade: UsersFacade,
  ) {}

  async executeCount(filters: FilterCriteria) {
    return this.usersFacade.getFilteredUsersCount(filters);
  }

  async executeList(filters: FilterCriteria) {
    return this.usersFacade.getFilteredUsersList(filters);
  }
}
