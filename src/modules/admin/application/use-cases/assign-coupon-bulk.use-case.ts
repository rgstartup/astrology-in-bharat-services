import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import {
  GetFilteredUsersUseCase,
  FilterCriteria,
} from './get-filtered-users.use-case';
import { CouponFacade } from '@/modules/commerce/coupon/application/coupon.facade';

@Injectable()
export class AssignCouponBulkUseCase {
  private readonly logger = new Logger(AssignCouponBulkUseCase.name);

  constructor(
    private readonly couponFacade: CouponFacade,
    private readonly getFilteredUsersUseCase: GetFilteredUsersUseCase,
  ) {}

  async execute(couponCode: string, filters: FilterCriteria) {
    // Get all matched users (without pagination limit)
    const matchedUsers = await this.getFilteredUsersUseCase.executeList({
      ...filters,
      page: 1,
      limit: 999999, // Effectively all matching users
    });

    if (matchedUsers.length === 0) {
      throw new BadRequestException(
        'No users found matching the selected filters',
      );
    }

    this.logger.log(
      `Assigning coupon ${couponCode} to ${matchedUsers.length} users bulk.`,
    );

    const userIds = matchedUsers.map((u) => u.id);

    return this.couponFacade.bulkAssign(couponCode, userIds);
  }
}
