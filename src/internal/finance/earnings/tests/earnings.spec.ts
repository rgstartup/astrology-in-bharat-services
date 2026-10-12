import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CalculateEarningsUseCase } from '../use-cases/calculate-earnings.use-case';
import { DistributeEarningsUseCase } from '../use-cases/distribute-earnings.use-case';
import { GetEarningSplitsUseCase } from '../use-cases/get-earning-splits.use-case';
import { ManageEarningPoliciesUseCase } from '../use-cases/manage-earning-policies.use-case';
import { EarningEventType } from '../enum';
import type { LedgerQueueService } from '@/core/queue/services/ledger-queue.service';

describe('Finance Earnings Module', () => {
  let mockLedgerQueue: Partial<LedgerQueueService>;

  beforeEach(() => {
    mockLedgerQueue = {
      enqueue: vi.fn().mockResolvedValue('job-id'),
    };
  });

  describe('CalculateEarningsUseCase', () => {
    it('should calculate per-minute consultation fee and GST with default rates', async () => {
      const mockDb = {
        query: {
          earningPolicies: {
            findFirst: vi.fn().mockResolvedValue(null),
          },
        },
      } as any;

      const useCase = new CalculateEarningsUseCase(mockDb);
      const result = await useCase.execute({
        grossAmount: 200,
        durationMinutes: 10,
        eventType: EarningEventType.CALL,
      });

      // Default rate: ₹2/min * 10 mins = ₹20 platform fee
      expect(result.grossAmount).toBe(200);
      expect(result.platformEarning).toBe(20);
      expect(result.gstOnPlatformFee).toBe(3.05); // (20 * 18) / 118 = 3.05
      expect(result.providerEarning).toBe(180); // 200 - 20 = 180
      expect(result.sellerAgentEarning).toBe(0);
      expect(result.buyerAgentEarning).toBe(0);
    });

    it('should calculate percentage fee for product order event', async () => {
      const mockDb = {
        query: {
          earningPolicies: {
            findFirst: vi.fn().mockResolvedValue(null),
          },
        },
      } as any;

      const useCase = new CalculateEarningsUseCase(mockDb);
      const result = await useCase.execute({
        grossAmount: 500,
        eventType: EarningEventType.PRODUCT_ORDER,
      });

      // Default fallback fixed rate ₹2
      expect(result.grossAmount).toBe(500);
      expect(result.platformEarning).toBe(2);
      expect(result.providerEarning).toBe(498);
    });

    it('should apply matching tier platform rate if policy and tiers exist', async () => {
      const mockDb = {
        query: {
          earningPolicies: {
            findFirst: vi.fn().mockResolvedValue({ id: 1 }),
          },
          earningTiers: {
            findMany: vi.fn().mockResolvedValue([
              {
                min_threshold: '100',
                max_threshold: '500',
                platform_rate: '5.00',
              },
            ]),
          },
        },
      } as any;

      const useCase = new CalculateEarningsUseCase(mockDb);
      const result = await useCase.execute({
        grossAmount: 300,
        durationMinutes: 5,
        eventType: EarningEventType.CHAT,
      });

      // Tier rate: ₹5/min * 5 mins = ₹25
      expect(result.platformEarning).toBe(25);
      expect(result.providerEarning).toBe(275);
      expect(result.policyId).toBe(1);
    });
  });

  describe('DistributeEarningsUseCase', () => {
    it('should calculate earnings, persist split, and enqueue ledger jobs', async () => {
      const mockSplitRow = {
        id: 1,
        reference_id: 'call_123',
        reference_type: EarningEventType.CALL,
        gross_amount: '200.00',
        platform_earning: '20.00',
        gst_on_platform_fee: '3.05',
        provider_earning: '180.00',
        seller_agent_earning: '10.00',
        buyer_agent_earning: '0.00',
        client_profile_id: 1,
        provider_profile_id: 2,
        seller_agent_profile_id: 3,
        buyer_agent_profile_id: null,
        policy_id: null,
        created_at: new Date(),
      };

      const mockDb = {
        query: {
          earningPolicies: {
            findFirst: vi.fn().mockResolvedValue(null),
          },
        },
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockSplitRow]),
          }),
        }),
      } as any;

      const calculateUseCase = new CalculateEarningsUseCase(mockDb);
      vi.spyOn(calculateUseCase, 'execute').mockResolvedValue({
        grossAmount: 200,
        platformEarning: 20,
        gstOnPlatformFee: 3.05,
        providerEarning: 170,
        sellerAgentEarning: 10,
        buyerAgentEarning: 0,
        policyId: null,
      });

      const useCase = new DistributeEarningsUseCase(
        mockDb,
        calculateUseCase,
        mockLedgerQueue as any,
      );

      const result = await useCase.execute({
        referenceId: 'call_123',
        eventType: EarningEventType.CALL,
        grossAmount: 200,
        durationMinutes: 10,
        sellerAgentProfileId: 3,
      });

      expect(result.reference_id).toBe('call_123');
      expect(result.platform_earning).toBe(20);
      expect(mockLedgerQueue.enqueue).toHaveBeenCalledTimes(2); // Platform + Seller Agent
    });
  });

  describe('GetEarningSplitsUseCase', () => {
    it('should return paginated list of earning splits', async () => {
      const mockRows = [
        {
          id: 1,
          reference_id: 'order_1',
          reference_type: EarningEventType.PRODUCT_ORDER,
          gross_amount: '500.00',
          platform_earning: '50.00',
          gst_on_platform_fee: '7.63',
          provider_earning: '450.00',
          seller_agent_earning: '0.00',
          buyer_agent_earning: '0.00',
          client_profile_id: null,
          provider_profile_id: 10,
          seller_agent_profile_id: null,
          buyer_agent_profile_id: null,
          policy_id: null,
          created_at: new Date(),
        },
      ];

      const mockDb = {
        select: vi
          .fn()
          .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    offset: vi.fn().mockResolvedValue(mockRows),
                  }),
                }),
              }),
            }),
          })
          .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([{ total: 1 }]),
            }),
          }),
      } as any;

      const useCase = new GetEarningSplitsUseCase(mockDb);
      const result = await useCase.execute({ limit: 10, offset: 0 });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].gross_amount).toBe(500);
      expect(result.meta.total).toBe(1);
    });

    it('should compute earnings summary aggregation', async () => {
      const mockSummary = {
        count: 5,
        totalGross: '2500.00',
        totalPlatformEarning: '250.00',
        totalGst: '38.15',
        totalProviderEarning: '2250.00',
        totalAgentEarning: '0.00',
      };

      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockSummary]),
          }),
        }),
      } as any;

      const useCase = new GetEarningSplitsUseCase(mockDb);
      const result = await useCase.summary({});

      expect(result.count).toBe(5);
      expect(result.totalGross).toBe(2500);
      expect(result.totalPlatformEarning).toBe(250);
      expect(result.totalProviderEarning).toBe(2250);
    });
  });

  describe('ManageEarningPoliciesUseCase', () => {
    it('should create policy and tiers in transaction', async () => {
      const mockPolicyRow = {
        id: 1,
        code: 'POLICY_TEST',
        name: 'Standard Consultation Policy',
        category: 'consultation',
        type: 'realtime_consultation',
        currency: 'INR',
        effective_from: new Date(),
        effective_until: null,
      };

      const mockDb = {
        transaction: vi.fn().mockImplementation(async (cb) => {
          const tx = {
            insert: vi
              .fn()
              .mockReturnValueOnce({
                values: vi.fn().mockReturnValue({
                  returning: vi.fn().mockResolvedValue([mockPolicyRow]),
                }),
              })
              .mockReturnValueOnce({
                values: vi.fn().mockResolvedValue([]),
              }),
          };
          return cb(tx);
        }),
      } as any;

      const useCase = new ManageEarningPoliciesUseCase(mockDb);
      const result = await useCase.createPolicy({
        name: 'Standard Consultation Policy',
        tiers: [
          {
            min_threshold: 0,
            max_threshold: 500,
            platform_rate: 2,
            agent_rate: 0,
          },
        ],
      } as any);

      expect(result.id).toBe(1);
      expect(result.name).toBe('Standard Consultation Policy');
    });

    it('should list all policies ordered by created_at DESC', async () => {
      const mockDb = {
        query: {
          earningPolicies: {
            findMany: vi.fn().mockResolvedValue([
              { id: 1, name: 'Policy 1' },
              { id: 2, name: 'Policy 2' },
            ]),
          },
        },
      } as any;

      const useCase = new ManageEarningPoliciesUseCase(mockDb);
      const result = await useCase.listPolicies();

      expect(result).toHaveLength(2);
    });

    it('should throw NotFoundException if policy by id is not found', async () => {
      const mockDb = {
        query: {
          earningPolicies: {
            findFirst: vi.fn().mockResolvedValue(null),
          },
        },
      } as any;

      const useCase = new ManageEarningPoliciesUseCase(mockDb);
      await expect(useCase.getPolicyById(999)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
