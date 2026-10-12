import { NotFoundException } from '@nestjs/common';
import { ResourceNotFoundError } from '@/shared/errors';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GetMerchantAccountUseCase } from '../use-cases/get-account.usecase';
import { UpdateMerchantAccountUseCase } from '../use-cases/update-account.usecase';
import { UpdateMerchantStatusUseCase } from '../use-cases/update-status.usecase';
import { QueryMerchantAccountsUseCase } from '../use-cases/query-accounts.usecase';
import { MerchantStatus } from '@/core/drizzledb/schema';
import type { IMerchant } from '@/shared/types/access-token.payload';

const mockMerchantUser: IMerchant = {
  sub: 10,
  email: 'merchant@example.com',
};

const mockMerchantRow = {
  id: 10,
  user_id: 100,
  uid: 'merchant-uid-10',
  is_blocked: false,
  name: 'Test Merchant',
  email: 'merchant@example.com',
  avatar: 'https://example.com/avatar.jpg',
  shop_name: 'Vedic Shop',
  manager_name: 'John Doe',
  phone: '9876543210',
  address: '123 Temple Road',
  city: 'Varanasi',
  pincode: '221001',
  image: null,
  video: null,
  status: MerchantStatus.ACTIVE,
  rating: '4.8',
  review_count: 24,
  established: '2020',
  description: 'Authentic pooja items',
  is_trusted: true,
  gallery: ['item1.jpg', 'item2.jpg'],
  features: ['Express Delivery'],
  is_online: true,
  gstin: null,
  pan: null,
  is_gst_exempt: false,
  bank_name: null,
  account_holder: null,
  account_number: null,
  ifsc: null,
  gst_certificate: null,
  pan_front: null,
  pan_back: null,
  aadhar_front: null,
  aadhar_back: null,
  is_verified: true,
  operational_hours: '09:00 AM - 08:00 PM',
  trust_score: '99.5',
  latitude: '25.3176000',
  longitude: '82.9739000',
  agent_commission_rate: 0.1,
  bank_accounts: null,
  razorpay_contact_id: null,
  created_at: new Date('2026-01-01T00:00:00Z'),
  updated_at: new Date('2026-01-01T00:00:00Z'),
};

describe('Merchant Account Use Cases', () => {
  let db: any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GetMerchantAccountUseCase', () => {
    it('should return mapped merchant account when found', async () => {
      db = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockMerchantRow]),
            }),
          }),
        }),
      };

      const useCase = new GetMerchantAccountUseCase(db);
      const result = await useCase.execute(mockMerchantUser);

      expect(result).toBeDefined();
      expect(result.id).toBe(10);
      expect(result.shop_name).toBe('Vedic Shop');
      expect(result.rating).toBe(4.8);
      expect(result.latitude).toBe(25.3176);
      expect(result.longitude).toBe(82.9739);
    });

    it('should throw NotFoundException when merchant account is not found', async () => {
      db = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      };

      const useCase = new GetMerchantAccountUseCase(db);
      await expect(useCase.execute(mockMerchantUser)).rejects.toThrow(
        ResourceNotFoundError,
      );
    });
  });

  describe('UpdateMerchantAccountUseCase', () => {
    it('should update and return updated merchant account', async () => {
      const updatedRow = {
        ...mockMerchantRow,
        shop_name: 'New Shop Name',
        latitude: '26.1234000',
        longitude: '83.5678000',
      };

      db = {
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([updatedRow]),
            }),
          }),
        }),
      };

      const useCase = new UpdateMerchantAccountUseCase(db);
      const result = await useCase.execute(mockMerchantUser, {
        shop_name: 'New Shop Name',
        latitude: 26.1234,
        longitude: 83.5678,
      });

      expect(result).toBeDefined();
      expect(result.shop_name).toBe('New Shop Name');
      expect(result.latitude).toBe(26.1234);
      expect(result.longitude).toBe(83.5678);
    });

    it('should throw ResourceNotFoundError if merchant account does not exist', async () => {
      db = {
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      };

      const useCase = new UpdateMerchantAccountUseCase(db);
      await expect(
        useCase.execute(mockMerchantUser, { shop_name: 'New Shop' }),
      ).rejects.toThrow(ResourceNotFoundError);
    });
  });

  describe('UpdateMerchantStatusUseCase', () => {
    it('should update is_online status successfully', async () => {
      const updatedRow = {
        ...mockMerchantRow,
        is_online: false,
      };

      db = {
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([updatedRow]),
            }),
          }),
        }),
      };

      const useCase = new UpdateMerchantStatusUseCase(db);
      const result = await useCase.execute(mockMerchantUser, false);

      expect(result.is_online).toBe(false);
    });

    it('should update verification status and is_verified', async () => {
      const updatedRow = {
        ...mockMerchantRow,
        status: MerchantStatus.ACTIVE,
        is_verified: true,
      };

      db = {
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([updatedRow]),
            }),
          }),
        }),
      };

      const useCase = new UpdateMerchantStatusUseCase(db);
      const result = await useCase.updateVerification(
        10,
        MerchantStatus.ACTIVE,
        true,
      );

      expect(result.status).toBe(MerchantStatus.ACTIVE);
    });

    it('should throw ResourceNotFoundError when updating non-existent account', async () => {
      db = {
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      };

      const useCase = new UpdateMerchantStatusUseCase(db);
      await expect(
        useCase.updateVerification(999, MerchantStatus.SUSPENDED),
      ).rejects.toThrow(ResourceNotFoundError);
    });
  });

  describe('QueryMerchantAccountsUseCase', () => {
    it('should list accounts with pagination and filters', async () => {
      db = {
        select: vi
          .fn()
          .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                offset: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue([mockMerchantRow]),
                }),
              }),
            }),
          })
          .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([{ value: 1 }]),
            }),
          }),
      };

      const useCase = new QueryMerchantAccountsUseCase(db);
      const result = await useCase.list({
        page: 1,
        limit: 10,
        offset: 0,
        q: 'Vedic',
        city: 'Varanasi',
        status: MerchantStatus.ACTIVE,
        is_online: 'true',
      } as any);

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.data[0].shop_name).toBe('Vedic Shop');
    });

    it('should get merchant by id', async () => {
      db = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockMerchantRow]),
            }),
          }),
        }),
      };

      const useCase = new QueryMerchantAccountsUseCase(db);
      const result = await useCase.byId(10);

      expect(result.id).toBe(10);
      expect(result.shop_name).toBe('Vedic Shop');
    });

    it('should throw NotFoundException when byId finds no merchant', async () => {
      db = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      };

      const useCase = new QueryMerchantAccountsUseCase(db);
      await expect(useCase.byId(999)).rejects.toThrow(NotFoundException);
    });

    it('should findEntityById returning entity or null', async () => {
      db = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockMerchantRow]),
            }),
          }),
        }),
      };

      const useCase = new QueryMerchantAccountsUseCase(db);
      const result = await useCase.findEntityById(10);

      expect(result).toBeDefined();
      expect(result?.shop_name).toBe('Vedic Shop');
    });

    it('should find byUserId returning entity or null', async () => {
      db = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockMerchantRow]),
            }),
          }),
        }),
      };

      const useCase = new QueryMerchantAccountsUseCase(db);
      const result = await useCase.byUserId(100);

      expect(result).toBeDefined();
      expect(result?.user_id).toBe(100);
    });

    it('should getRaw returning all accounts', async () => {
      db = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockResolvedValue([mockMerchantRow]),
        }),
      };

      const useCase = new QueryMerchantAccountsUseCase(db);
      const results = await useCase.getRaw();

      expect(results).toHaveLength(1);
      expect(results[0].shop_name).toBe('Vedic Shop');
    });
  });
});
