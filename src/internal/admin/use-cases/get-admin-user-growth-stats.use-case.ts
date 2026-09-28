import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { UsersService } from '@/internal/users/users.service';

@Injectable()
export class GetAdminUserGrowthStatsUseCase {
  constructor(
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
  ) {}

  async execute(days: number = 7) {
    return this.usersService.getUserExpertGrowthStats(days);
  }
}
