import { Injectable } from '@nestjs/common';
import { UsersFacade } from '@/modules/users/application/users.facade';

@Injectable()
export class GetAdminUserGrowthStatsUseCase {
  constructor(private readonly usersFacade: UsersFacade) {}

  async execute(days: number = 7) {
    return this.usersFacade.getUserExpertGrowthStats(days);
  }
}
