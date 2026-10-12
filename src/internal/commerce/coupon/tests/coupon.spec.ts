import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApplyCouponUseCase } from '../use-cases/apply-coupon.use-case';
import { CreateCouponUseCase } from '../use-cases/create-coupon.use-case';
import { GetCouponsUseCase } from '../use-cases/get-coupons.use-case';
import { GetCouponStatsUseCase } from '../use-cases/get-coupon-stats.use-case';
import { UpdateCouponUseCase } from '../use-cases/update-coupon.use-case';
import { DeleteCouponUseCase } from '../use-cases/delete-coupon.use-case';
import { GetMyRewardsUseCase } from '../use-cases/get-my-rewards.use-case';
import { MarkCouponAsUsedUseCase } from '../use-cases/mark-coupon-as-used.use-case';
import { BulkAssignCouponUseCase } from '../use-cases/bulk-assign-coupon.use-case';
import { CouponStatus, CouponType } from '@/core/enums';

const mockCouponRow = {
  id: 1,
  code: 'FESTIVE50',
  description: '50% off on all pooja items',
  type: CouponType.PERCENTAGE,
  value: 50,
  min_order_value: 200,
  max_discount: 100,
  expiry_date: new Date(Date.now() + 86400000), // tomorrow
  max_usage_limit: 100,
  usage_count: 5,
  status: CouponStatus.ACTIVE,
  is_active: true,
  created_at: new Date('2026-01-01T00:00:00Z'),
  updated_at: new Date('2026-01-01T00:00:00Z'),
};

describe('Commerce Coupon Use Cases', () => {
  let db: any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ApplyCouponUseCase', () => {
    it('should calculate percentage discount capped at max_discount', async () => {
      db = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockCouponRow]),
            }),
          }),
        }),
      };

      const useCase = new ApplyCouponUseCase(db);
      const result = await useCase.execute({
        code: 'FESTIVE50',
        amount: 500,
      });

      expect(result.isValid).toBe(true);
      expect(result.discount).toBe(100); // 50% of 500 = 250, capped at max_discount 100
      expect(result.final_amount).toBe(400);
    });

    it('should calculate flat discount correctly', async () => {
      const flatCoupon = {
        ...mockCouponRow,
        type: CouponType.FLAT,
        value: 75,
        max_discount: 0,
        min_order_value: 100,
      };

      db = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([flatCoupon]),
            }),
          }),
        }),
      };

      const useCase = new ApplyCouponUseCase(db);
      const result = await useCase.execute({
        code: 'FESTIVE50',
        amount: 300,
      });

      expect(result.isValid).toBe(true);
      expect(result.discount).toBe(75);
      expect(result.final_amount).toBe(225);
    });

    it('should throw NotFoundException if coupon is inactive or missing', async () => {
      db = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      };

      const useCase = new ApplyCouponUseCase(db);
      await expect(
        useCase.execute({ code: 'INVALID', amount: 500 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if coupon is expired', async () => {
      const expiredCoupon = {
        ...mockCouponRow,
        expiry_date: new Date(Date.now() - 86400000), // yesterday
      };

      db = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([expiredCoupon]),
            }),
          }),
        }),
      };

      const useCase = new ApplyCouponUseCase(db);
      await expect(
        useCase.execute({ code: 'FESTIVE50', amount: 500 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if usage limit reached', async () => {
      const limitReachedCoupon = {
        ...mockCouponRow,
        max_usage_limit: 10,
        usage_count: 10,
      };

      db = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([limitReachedCoupon]),
            }),
          }),
        }),
      };

      const useCase = new ApplyCouponUseCase(db);
      await expect(
        useCase.execute({ code: 'FESTIVE50', amount: 500 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if min_order_value not met', async () => {
      db = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockCouponRow]),
            }),
          }),
        }),
      };

      const useCase = new ApplyCouponUseCase(db);
      await expect(
        useCase.execute({ code: 'FESTIVE50', amount: 150 }), // min is 200
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('CreateCouponUseCase', () => {
    it('should create coupon successfully', async () => {
      db = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockCouponRow]),
          }),
        }),
      };

      const useCase = new CreateCouponUseCase(db);
      const result = await useCase.execute({
        code: 'FESTIVE50',
        value: 50,
      });

      expect(result.code).toBe('FESTIVE50');
      expect(result.id).toBe(1);
    });

    it('should throw ConflictException if coupon code already exists', async () => {
      db = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([{ id: 1 }]),
            }),
          }),
        }),
      };

      const useCase = new CreateCouponUseCase(db);
      await expect(
        useCase.execute({ code: 'FESTIVE50', value: 50 }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('GetCouponsUseCase', () => {
    it('should list coupons and map expired status', async () => {
      const expiredItem = {
        ...mockCouponRow,
        id: 2,
        code: 'OLDCOUPON',
        status: CouponStatus.ACTIVE,
        expiry_date: new Date(Date.now() - 10000),
      };

      db = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockResolvedValue([mockCouponRow, expiredItem]),
            }),
          }),
        }),
      };

      const useCase = new GetCouponsUseCase(db);
      const results = await useCase.execute({ status: 'all', search: 'COUPON' });

      expect(results).toHaveLength(2);
      expect(results[0].status).toBe(CouponStatus.ACTIVE);
      expect(results[1].status).toBe(CouponStatus.EXPIRED);
    });
  });

  describe('GetCouponStatsUseCase', () => {
    it('should return aggregated coupon statistics', async () => {
      db = {
        select: vi
          .fn()
          .mockReturnValueOnce({
            from: vi.fn().mockResolvedValue([{ value: 20 }]),
          })
          .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([{ value: 12 }]),
            }),
          })
          .mockReturnValueOnce({
            from: vi.fn().mockResolvedValue([{ value: 150 }]),
          })
          .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([{ value: 18 }]),
            }),
          }),
      };

      const useCase = new GetCouponStatsUseCase(db);
      const stats = await useCase.execute();

      expect(stats.totalCoupons).toBe(20);
      expect(stats.activeCoupons).toBe(12);
      expect(stats.totalRedemptions).toBe(150);
      expect(stats.usedToday).toBe(18);
    });
  });

  describe('UpdateCouponUseCase', () => {
    it('should update coupon and return success boolean', async () => {
      db = {
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([mockCouponRow]),
            }),
          }),
        }),
      };

      const useCase = new UpdateCouponUseCase(db);
      const result = await useCase.execute(1, { description: 'Updated' });

      expect(result.success).toBe(true);
    });

    it('should throw NotFoundException if coupon to update does not exist', async () => {
      db = {
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      };

      const useCase = new UpdateCouponUseCase(db);
      await expect(useCase.execute(999, { description: 'Updated' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('DeleteCouponUseCase', () => {
    it('should delete coupon and return success boolean', async () => {
      db = {
        delete: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockCouponRow]),
          }),
        }),
      };

      const useCase = new DeleteCouponUseCase(db);
      const result = await useCase.execute(1);

      expect(result.success).toBe(true);
    });

    it('should throw NotFoundException if coupon to delete does not exist', async () => {
      db = {
        delete: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([]),
          }),
        }),
      };

      const useCase = new DeleteCouponUseCase(db);
      await expect(useCase.execute(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('GetMyRewardsUseCase', () => {
    it('should fetch user rewards with coupon details', async () => {
      const mockReward = {
        id: 1,
        client_id: 10,
        coupon_id: 1,
        is_used: false,
        used_at: null,
        assigned_at: new Date('2026-01-01T00:00:00Z'),
        updated_at: new Date('2026-01-01T00:00:00Z'),
        coupon: mockCouponRow,
      };

      db = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockResolvedValue([mockReward]),
              }),
            }),
          }),
        }),
      };

      const useCase = new GetMyRewardsUseCase(db);
      const rewards = await useCase.execute(10);

      expect(rewards).toHaveLength(1);
      expect(rewards[0].client_id).toBe(10);
      expect(rewards[0].coupon.code).toBe('FESTIVE50');
    });
  });

  describe('MarkCouponAsUsedUseCase', () => {
    it('should increment usage count and upsert user coupon record', async () => {
      db = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockCouponRow]),
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(undefined),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
          }),
        }),
      };

      const useCase = new MarkCouponAsUsedUseCase(db);
      const result = await useCase.execute(10, 'FESTIVE50');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Coupon applied and marked as used');
    });

    it('should throw NotFoundException if coupon not found', async () => {
      db = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      };

      const useCase = new MarkCouponAsUsedUseCase(db);
      await expect(useCase.execute(10, 'INVALID')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('BulkAssignCouponUseCase', () => {
    it('should bulk assign coupon to matching user accounts', async () => {
      db = {
        select: vi
          .fn()
          .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([mockCouponRow]),
              }),
            }),
          })
          .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([{ id: 101 }, { id: 102 }]),
            }),
          }),
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            onConflictDoNothing: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([{ id: 1 }, { id: 2 }]),
            }),
          }),
        }),
      };

      const useCase = new BulkAssignCouponUseCase(db);
      const result = await useCase.execute('FESTIVE50', [1, 2]);

      expect(result.success).toBe(true);
      expect(result.totalMatched).toBe(2);
      expect(result.assignedCount).toBe(2);
    });

    it('should throw NotFoundException if coupon not found', async () => {
      db = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      };

      const useCase = new BulkAssignCouponUseCase(db);
      await expect(useCase.execute('INVALID', [1])).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should handle empty userIds array gracefully', async () => {
      db = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockCouponRow]),
            }),
          }),
        }),
      };

      const useCase = new BulkAssignCouponUseCase(db);
      const result = await useCase.execute('FESTIVE50', []);

      expect(result.success).toBe(true);
      expect(result.totalMatched).toBe(0);
      expect(result.assignedCount).toBe(0);
    });
  });
});
