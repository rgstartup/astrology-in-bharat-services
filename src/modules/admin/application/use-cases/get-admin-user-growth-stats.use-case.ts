import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { UsersFacade } from '@/modules/users/application/users.facade';

@Injectable()
export class GetAdminUserGrowthStatsUseCase {
  constructor(
    @Inject(forwardRef(() => UsersFacade))
    private readonly usersFacade: UsersFacade,
  ) {}

  async execute(days: number = 7) {
    return this.usersFacade.getUserExpertGrowthStats(days);
  }
}
