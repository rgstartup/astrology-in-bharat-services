import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { DatabaseService } from '@/core/database/database.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Coupon,
  CouponStatus,
} from '../../infrastructure/entities/coupon.entity';
import { UserCoupon } from '../../infrastructure/entities/user-coupon.entity';
import { ProfileClient } from '@/modules/client/profile/infrastructure/entities/profile-client.entity';

@Injectable()
export class BulkAssignCouponUseCase {
  private readonly logger = new Logger(BulkAssignCouponUseCase.name);

  constructor(
    @InjectRepository(Coupon)
    private readonly couponRepo: Repository<Coupon>,
    private readonly databaseService: DatabaseService,
  ) {}

  async execute(couponCode: string, userIds: string[]) {
    const coupon = await this.couponRepo.findOne({
      where: { code: couponCode, is_active: true, status: CouponStatus.ACTIVE },
    });

    if (!coupon) {
      throw new NotFoundException(
        `Active coupon with code "${couponCode}" not found`,
      );
    }

    this.logger.log(
      `Assigning coupon ${couponCode} to ${userIds.length} users bulk.`,
    );

    let assignedCount = 0;

    await this.databaseService.transaction(async (queryRunner) => {
      // 1. Fetch ProfileClient IDs for the provided user IDs (Only those that exist)
      const profileClients: { id: string }[] = await queryRunner.manager
        .createQueryBuilder(ProfileClient, 'profileClient')
        .select('profileClient.id', 'id')
        .where('profileClient.user_id IN (:...userIds)', { userIds })
        .getRawMany();

      if (profileClients.length === 0) return;

      const profileClientIds = profileClients.map((pc) => pc.id);

      // 2. Perform a Bulk Insert using QueryBuilder and ignore conflicts
      // PostgreSQL handles ON CONFLICT DO NOTHING natively when using orIgnore()
      const valuesToInsert = profileClientIds.map((clientId) => ({
        client_id: clientId,
        coupon_id: coupon.id,
        is_used: false,
      }));

      const insertResult = await queryRunner.manager
        .createQueryBuilder()
        .insert()
        .into(UserCoupon)
        .values(valuesToInsert)
        .orIgnore() // Skips already assigned coupons
        .execute();

      assignedCount = insertResult.identifiers
        ? insertResult.identifiers.length
        : 0;
      // Note: orIgnore might return empty identifiers depending on TypeORM version/driver.
      // If we need strict count, we can do a count before/after, or just assume success on bulk insert.
      // We will fallback to counting raw inserted rows if supported.
      if (insertResult.raw && Array.isArray(insertResult.raw)) {
        assignedCount = insertResult.raw.length;
      }
    });

    return {
      success: true,
      totalMatched: userIds.length,
      assignedCount: assignedCount,
    };
  }
}
