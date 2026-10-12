import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { CreateReviewUseCase } from '../use-cases/create-review.use-case';
import { GetExpertReviewsUseCase } from '../use-cases/get-expert-reviews.use-case';
import { GetMerchantReviewsUseCase } from '../use-cases/get-merchant-reviews.use-case';
import { GetReviewsStatsUseCase } from '../use-cases/get-reviews-stats.use-case';
import { GetMerchantReviewsStatsUseCase } from '../use-cases/get-merchant-reviews-stats.use-case';
import { GetAdminReviewsUseCase } from '../use-cases/get-admin-reviews.use-case';
import { GetAdminReviewsStatsUseCase } from '../use-cases/get-admin-reviews-stats.use-case';
import { GetApprovedPlatformReviewsUseCase } from '../use-cases/get-approved-platform-reviews.use-case';
import { GetExpertReviewsByDateUseCase } from '../use-cases/get-expert-reviews-by-date.use-case';
import { UpdateReviewStatusUseCase } from '../use-cases/update-review-status.use-case';
import { DeleteReviewUseCase } from '../use-cases/delete-review.use-case';
import { SendReviewResponseUseCase } from '../use-cases/send-review-response.use-case';
import { ReviewsService } from '../reviews.service';
import { OrderStatus } from '../../../commerce/order/enum';

describe('Consultation Reviews Module', () => {
  describe('CreateReviewUseCase', () => {
    it('should create platform review successfully', async () => {
      const mockSavedReview = {
        id: 1,
        client_id: 10,
        expert_id: null,
        merchant_id: null,
        order_id: null,
        session_id: null,
        call_session_id: null,
        rating: 5,
        comment: 'Great platform',
        tags: 'fast,reliable',
        review_type: 'platform',
        status: 'pending',
        created_at: new Date(),
        updated_at: new Date(),
      };

      const mockDb = {
        transaction: vi.fn().mockImplementation(async (cb) => {
          const tx = {
            insert: vi.fn().mockReturnValue({
              values: vi.fn().mockReturnValue({
                returning: vi.fn().mockResolvedValue([mockSavedReview]),
              }),
            }),
          };
          return cb(tx);
        }),
      } as any;

      const useCase = new CreateReviewUseCase(mockDb);
      const result = await useCase.execute(10, {
        rating: 5,
        comment: 'Great platform',
        tags: ['fast', 'reliable'],
        review_type: 'platform',
      });

      expect(result.id).toBe(1);
      expect(result.rating).toBe(5);
      expect(result.review_type).toBe('platform');
      expect(result.status).toBe('pending');
    });

    it('should create expert review and update expert ratings', async () => {
      const mockExpert = { id: 101, user_id: 201 };
      const mockSavedReview = {
        id: 2,
        client_id: 10,
        expert_id: 101,
        merchant_id: null,
        order_id: null,
        session_id: 50,
        call_session_id: null,
        rating: 4,
        comment: 'Insightful astrologer',
        tags: 'accurate',
        review_type: 'expert',
        status: 'approved',
        created_at: new Date(),
        updated_at: new Date(),
      };

      const mockDb = {
        transaction: vi.fn().mockImplementation(async (cb) => {
          const tx = {
            query: {
              expertAccounts: {
                findFirst: vi.fn().mockResolvedValue(mockExpert),
              },
              consultationSessions: {
                findFirst: vi.fn().mockResolvedValue({ id: 50 }),
              },
              reviews: {
                findFirst: vi.fn().mockResolvedValue(null),
              },
            },
            insert: vi.fn().mockReturnValue({
              values: vi.fn().mockReturnValue({
                returning: vi.fn().mockResolvedValue([mockSavedReview]),
              }),
            }),
            select: vi.fn().mockReturnValue({
              from: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([{ avg: '4.5', count: 2 }]),
              }),
            }),
            update: vi.fn().mockReturnValue({
              set: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue({}),
              }),
            }),
          };
          return cb(tx);
        }),
      } as any;

      const useCase = new CreateReviewUseCase(mockDb);
      const result = await useCase.execute(10, {
        expert_id: 101,
        sessionId: 50,
        rating: 4,
        comment: 'Insightful astrologer',
        tags: ['accurate'],
      });

      expect(result.id).toBe(2);
      expect(result.expert_id).toBe(101);
      expect(result.review_type).toBe('expert');
    });

    it('should throw NotFoundException if expert not found', async () => {
      const mockDb = {
        transaction: vi.fn().mockImplementation(async (cb) => {
          const tx = {
            query: {
              expertAccounts: {
                findFirst: vi.fn().mockResolvedValue(null),
              },
            },
          };
          return cb(tx);
        }),
      } as any;

      const useCase = new CreateReviewUseCase(mockDb);
      await expect(
        useCase.execute(10, { expert_id: 999, rating: 5 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if merchant review order not delivered', async () => {
      const mockMerchant = { id: 201, user_id: 301 };
      const mockDb = {
        transaction: vi.fn().mockImplementation(async (cb) => {
          const tx = {
            query: {
              merchantAccounts: {
                findFirst: vi.fn().mockResolvedValue(mockMerchant),
              },
              orders: {
                findFirst: vi.fn().mockResolvedValue({
                  id: 12,
                  client_id: 10,
                  status: OrderStatus.PROCESSING,
                  items: [{ merchant_id: 201 }],
                }),
              },
            },
          };
          return cb(tx);
        }),
      } as any;

      const useCase = new CreateReviewUseCase(mockDb);
      await expect(
        useCase.execute(10, {
          merchantId: 201,
          orderId: 12,
          rating: 4,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException if order does not contain items from merchant', async () => {
      const mockMerchant = { id: 201, user_id: 301 };
      const mockDb = {
        transaction: vi.fn().mockImplementation(async (cb) => {
          const tx = {
            query: {
              merchantAccounts: {
                findFirst: vi.fn().mockResolvedValue(mockMerchant),
              },
              orders: {
                findFirst: vi.fn().mockResolvedValue({
                  id: 12,
                  client_id: 10,
                  status: OrderStatus.DELIVERED,
                  items: [{ merchant_id: 999 }],
                }),
              },
            },
          };
          return cb(tx);
        }),
      } as any;

      const useCase = new CreateReviewUseCase(mockDb);
      await expect(
        useCase.execute(10, {
          merchantId: 201,
          orderId: 12,
          rating: 4,
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('GetExpertReviewsUseCase & GetMerchantReviewsUseCase', () => {
    it('should return paginated expert reviews with client details', async () => {
      const mockDb = {
        query: {
          expertAccounts: {
            findFirst: vi.fn().mockResolvedValue({ id: 101, user_id: 201 }),
          },
          reviews: {
            findMany: vi.fn().mockResolvedValue([
              {
                id: 1,
                client_id: 10,
                expert_id: 101,
                rating: 5,
                comment: 'Great',
                review_type: 'expert',
                status: 'approved',
                client: {
                  id: 10,
                  first_name: 'John',
                  last_name: 'Doe',
                  user: { email: 'john@example.com' },
                },
              },
            ]),
          },
        },
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ total: 1 }]),
          }),
        }),
      } as any;

      const useCase = new GetExpertReviewsUseCase(mockDb);
      const result = await useCase.execute(101, { page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].client?.name).toBe('John Doe');
      expect(result.total).toBe(1);
    });

    it('should return paginated merchant reviews', async () => {
      const mockDb = {
        query: {
          reviews: {
            findMany: vi.fn().mockResolvedValue([
              {
                id: 5,
                client_id: 10,
                merchant_id: 201,
                rating: 4,
                comment: 'Good product',
                review_type: 'merchant',
                status: 'approved',
                client: {
                  id: 10,
                  first_name: 'Jane',
                  last_name: 'Doe',
                  user: { email: 'jane@example.com' },
                },
              },
            ]),
          },
        },
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ total: 1 }]),
          }),
        }),
      } as any;

      const useCase = new GetMerchantReviewsUseCase(mockDb);
      const result = await useCase.execute(201, { page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe('Jane Doe');
      expect(result.meta.total).toBe(1);
    });
  });

  describe('GetReviewsStatsUseCase & GetMerchantReviewsStatsUseCase', () => {
    it('should calculate expert rating breakdown stats', async () => {
      const mockDb = {
        query: {
          expertAccounts: {
            findFirst: vi.fn().mockResolvedValue({ id: 101, user_id: 201 }),
          },
        },
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              groupBy: vi.fn().mockResolvedValue([
                { rating: 5, count: 6 },
                { rating: 4, count: 4 },
              ]),
            }),
          }),
        }),
      } as any;

      const useCase = new GetReviewsStatsUseCase(mockDb);
      const result = await useCase.execute(101);

      expect(result).not.toBeNull();
      expect(result?.rating).toBe(4.6);
      expect(result?.totalReviews).toBe(10);
      expect(result?.counts['5']).toBe(6);
      expect(result?.counts['4']).toBe(4);
      expect(result?.counts['1']).toBe(0);
    });

    it('should calculate merchant rating breakdown stats', async () => {
      const mockDb = {
        select: vi
          .fn()
          .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([{ avg: '4.0', count: 5 }]),
            }),
          })
          .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                groupBy: vi.fn().mockResolvedValue([{ rating: 4, count: 5 }]),
              }),
            }),
          }),
      } as any;

      const useCase = new GetMerchantReviewsStatsUseCase(mockDb);
      const result = await useCase.execute(201);

      expect(result.average_rating).toBe(4);
      expect(result.totalReviews).toBe(5);
      expect(result.distribution['4']).toBe(5);
    });
  });

  describe('GetAdminReviewsUseCase & GetAdminReviewsStatsUseCase', () => {
    it('should list admin reviews with filtering and pagination', async () => {
      const mockDb = {
        query: {
          reviews: {
            findMany: vi.fn().mockResolvedValue([
              {
                id: 1,
                client_id: 10,
                rating: 5,
                review_type: 'platform',
                status: 'pending',
                client: {
                  id: 10,
                  first_name: 'Admin',
                  last_name: 'Tester',
                },
              },
            ]),
          },
        },
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ total: 1 }]),
          }),
        }),
      } as any;

      const useCase = new GetAdminReviewsUseCase(mockDb);
      const result = await useCase.execute({ page: 1, limit: 10, status: 'pending' });

      expect(result.reviews).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should calculate admin reviews stats breakdown by rating tier', async () => {
      const mockDb = {
        select: vi
          .fn()
          .mockReturnValueOnce({
            from: vi.fn().mockResolvedValue([{ total: 20 }]),
          })
          .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([{ good: 15 }]),
            }),
          })
          .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([{ moderate: 3 }]),
            }),
          })
          .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([{ bad: 2 }]),
            }),
          }),
      } as any;

      const useCase = new GetAdminReviewsStatsUseCase(mockDb);
      const result = await useCase.execute();

      expect(result.total).toBe(20);
      expect(result.good).toBe(15);
      expect(result.moderate).toBe(3);
      expect(result.bad).toBe(2);
    });
  });

  describe('GetApprovedPlatformReviewsUseCase & GetExpertReviewsByDateUseCase', () => {
    it('should return approved platform reviews up to limit', async () => {
      const mockDb = {
        query: {
          reviews: {
            findMany: vi.fn().mockResolvedValue([
              {
                id: 1,
                client_id: 10,
                rating: 5,
                comment: 'Superb',
                review_type: 'platform',
                status: 'approved',
                client: {
                  id: 10,
                  first_name: 'Happy',
                  last_name: 'User',
                },
              },
            ]),
          },
        },
      } as any;

      const useCase = new GetApprovedPlatformReviewsUseCase(mockDb);
      const result = await useCase.execute(5);

      expect(result).toHaveLength(1);
      expect(result[0].user.name).toBe('Happy User');
    });

    it('should return expert reviews filtered by date range', async () => {
      const mockDb = {
        query: {
          reviews: {
            findMany: vi.fn().mockResolvedValue([
              {
                id: 1,
                client_id: 10,
                expert_id: 101,
                rating: 5,
                review_type: 'expert',
                created_at: new Date('2026-01-15'),
                client: {
                  id: 10,
                  first_name: 'Test',
                  last_name: 'Client',
                },
              },
            ]),
          },
        },
      } as any;

      const useCase = new GetExpertReviewsByDateUseCase(mockDb);
      const result = await useCase.execute(
        101,
        new Date('2026-01-01'),
        new Date('2026-01-31'),
      );

      expect(result).toHaveLength(1);
      expect(result[0].client?.name).toBe('Test Client');
    });
  });

  describe('UpdateReviewStatusUseCase & DeleteReviewUseCase', () => {
    it('should update review status and recalculate expert rating', async () => {
      const mockReview = { id: 1, expert_id: 101, merchant_id: null, status: 'pending' };
      const mockDb = {
        transaction: vi.fn().mockImplementation(async (cb) => {
          const tx = {
            query: {
              reviews: {
                findFirst: vi.fn().mockResolvedValue(mockReview),
              },
            },
            update: vi
              .fn()
              .mockReturnValueOnce({
                set: vi.fn().mockReturnValue({
                  where: vi.fn().mockReturnValue({
                    returning: vi.fn().mockResolvedValue([{ id: 1, status: 'approved' }]),
                  }),
                }),
              })
              .mockReturnValueOnce({
                set: vi.fn().mockReturnValue({
                  where: vi.fn().mockResolvedValue({}),
                }),
              }),
            select: vi.fn().mockReturnValue({
              from: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([{ avg: '5.0', count: 1 }]),
              }),
            }),
          };
          return cb(tx);
        }),
      } as any;

      const useCase = new UpdateReviewStatusUseCase(mockDb);
      const result = await useCase.execute(1, 'approved');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Review Updated Successfully');
    });

    it('should delete review successfully', async () => {
      const mockDb = {
        delete: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ id: 2 }]),
          }),
        }),
      } as any;

      const useCase = new DeleteReviewUseCase(mockDb);
      const result = await useCase.execute(2);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Review deleted successfully');
    });
  });

  describe('SendReviewResponseUseCase', () => {
    it('should send notification response to astrologer', async () => {
      const mockNotificationService = {
        create: vi.fn().mockResolvedValue({ id: 1 }),
      };

      const mockDb = {
        query: {
          reviews: {
            findFirst: vi.fn().mockResolvedValue({ id: 1, expert_id: 101 }),
          },
          expertAccounts: {
            findFirst: vi.fn().mockResolvedValue({
              id: 101,
              user: { id: 201, email: 'expert@example.com' },
            }),
          },
        },
      } as any;

      const useCase = new SendReviewResponseUseCase(
        mockDb,
        mockNotificationService as any,
      );
      const result = await useCase.execute(1, 'Thank you for your feedback');

      expect(result.success).toBe(true);
      expect(mockNotificationService.create).toHaveBeenCalledWith(
        101,
        'expert',
        'general',
        'Admin Message regarding review',
        'Thank you for your feedback',
        { reviewId: 1 },
      );
    });
  });

  describe('ReviewsService Delegation', () => {
    it('should delegate method calls to appropriate use cases', async () => {
      const createReviewUseCase = { execute: vi.fn().mockResolvedValue({ id: 1 }) } as any;
      const getExpertReviewsUseCase = { execute: vi.fn().mockResolvedValue({ data: [] }) } as any;
      const getMerchantReviewsUseCase = { execute: vi.fn().mockResolvedValue({ data: [] }) } as any;
      const getReviewsStatsUseCase = { execute: vi.fn().mockResolvedValue({ average: 0 }) } as any;
      const getMerchantReviewsStatsUseCase = { execute: vi.fn().mockResolvedValue({ average: 0 }) } as any;
      const getAdminReviewsUseCase = { execute: vi.fn().mockResolvedValue({ data: [] }) } as any;
      const getAdminReviewsStatsUseCase = { execute: vi.fn().mockResolvedValue({ total: 0 }) } as any;
      const deleteReviewUseCase = { execute: vi.fn().mockResolvedValue({ success: true }) } as any;
      const updateReviewStatusUseCase = { execute: vi.fn().mockResolvedValue({ success: true }) } as any;
      const sendReviewResponseUseCase = { execute: vi.fn().mockResolvedValue({ success: true }) } as any;
      const getApprovedPlatformReviewsUseCase = { execute: vi.fn().mockResolvedValue([]) } as any;
      const getExpertReviewsByDateUseCase = { execute: vi.fn().mockResolvedValue([]) } as any;

      const service = new ReviewsService(
        createReviewUseCase,
        getExpertReviewsUseCase,
        getMerchantReviewsUseCase,
        getReviewsStatsUseCase,
        getMerchantReviewsStatsUseCase,
        getAdminReviewsUseCase,
        getAdminReviewsStatsUseCase,
        deleteReviewUseCase,
        updateReviewStatusUseCase,
        sendReviewResponseUseCase,
        getApprovedPlatformReviewsUseCase,
        getExpertReviewsByDateUseCase,
      );

      await service.createReview(1, {} as any);
      expect(createReviewUseCase.execute).toHaveBeenCalled();

      await service.getExpertReviews(101, {} as any);
      expect(getExpertReviewsUseCase.execute).toHaveBeenCalled();

      await service.getMerchantReviews(201, {} as any);
      expect(getMerchantReviewsUseCase.execute).toHaveBeenCalled();

      await service.getReviewsStats(101);
      expect(getReviewsStatsUseCase.execute).toHaveBeenCalled();

      await service.getMerchantReviewsStats(201);
      expect(getMerchantReviewsStatsUseCase.execute).toHaveBeenCalled();

      await service.getAdminReviews({} as any);
      expect(getAdminReviewsUseCase.execute).toHaveBeenCalled();

      await service.getAllReviewsStats();
      expect(getAdminReviewsStatsUseCase.execute).toHaveBeenCalled();

      await service.updateReviewStatus(1, 'approved');
      expect(updateReviewStatusUseCase.execute).toHaveBeenCalled();

      await service.deleteReview(1);
      expect(deleteReviewUseCase.execute).toHaveBeenCalled();

      await service.sendReviewResponse(1, 'msg');
      expect(sendReviewResponseUseCase.execute).toHaveBeenCalled();

      await service.getApprovedPlatformReviews(5);
      expect(getApprovedPlatformReviewsUseCase.execute).toHaveBeenCalled();

      await service.getExpertReviewsByDate(101, new Date(), new Date());
      expect(getExpertReviewsByDateUseCase.execute).toHaveBeenCalled();
    });
  });
});
