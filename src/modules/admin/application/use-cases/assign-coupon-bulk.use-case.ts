import { Injectable, BadRequestException, Logger, Inject, forwardRef } from '@nestjs/common';
import { UsersFacade } from '@/modules/users/application/users.facade';
import { CouponFacade } from '@/modules/commerce/coupon/application/coupon.facade';
import { AssignCouponBulkDto } from '../../api/dto/assign-coupon-bulk.dto';

@Injectable()
export class AssignCouponBulkUseCase {
  private readonly logger = new Logger(AssignCouponBulkUseCase.name);

  constructor(
    private readonly couponFacade: CouponFacade,
    @Inject(forwardRef(() => UsersFacade))
    private readonly usersFacade: UsersFacade,
  ) {}

  async execute(dto: AssignCouponBulkDto) {
    const { couponCode, filters } = dto;

    // Get all matched users (without pagination limit)
    const matchedUsers = await this.usersFacade.getFilteredUsersList({
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

