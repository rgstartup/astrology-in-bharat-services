import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfileMerchant } from '@/modules/merchant/profile/infrastructure/entities/profile-merchant.entity';
import { EncryptionService } from '@/common/services/encryption.service';

@Injectable()
export class GetAdminMerchantsUseCase {
  constructor(
    @InjectRepository(ProfileMerchant)
    private readonly merchantRepository: Repository<ProfileMerchant>,
    private readonly encryptionService: EncryptionService,
  ) {}

  async execute(params: {
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    try {
      const page = Number(params.page) || 1;
      const limit = Number(params.limit) || 10;
      const skip = (page - 1) * limit;

      const qb = this.merchantRepository
        .createQueryBuilder('merchant')
        .leftJoinAndSelect('merchant.user', 'user');

      if (params.search) {
        const searchLower = params.search.toLowerCase();
        qb.andWhere(
          '(LOWER(merchant.shopName) LIKE :search OR LOWER(merchant.city) LIKE :search OR LOWER(merchant.phone) LIKE :search)',
          { search: `%${searchLower}%` },
        );
      }

      if (params.status) {
        qb.andWhere('merchant.status = :status', { status: params.status });
      }

      qb.orderBy('merchant.created_at', 'DESC');
      qb.skip(skip).take(limit);

      const [merchants, total] = await qb.getManyAndCount();

      if (merchants.length === 0) {
        return {
          data: [],
          total: 0,
          page,
          limit,
        };
      }

      const merchantIds = merchants.map((m) => m.id);
      const itemsSoldMap = new Map<string, number>();
      
      try {
        const salesData = await this.merchantRepository.manager.query(
          `SELECT p.merchant_id, SUM(oi.quantity) as items_sold
           FROM commerce.products p
           JOIN commerce.order_items oi ON p.id = oi.product_id
           WHERE p.merchant_id = ANY($1)
           GROUP BY p.merchant_id`,
          [merchantIds]
        );
        
        for (const row of salesData) {
          itemsSoldMap.set(row.merchant_id, Number(row.items_sold));
        }
      } catch (error) {
        console.error('Failed to calculate items sold:', error);
      }

      return {
        data: merchants.map((m) => {
          const decryptedPan = this.encryptionService.decrypt(m.pan);
          const decryptedAcc = this.encryptionService.decrypt(m.accountNumber);

          // Masking logic: Show only last 4 digits
          const mask = (val?: string) => {
            if (!val) return null;
            return val.length > 4 ? `XXXX${val.slice(-4)}` : val;
          };

          return {
            id: m.id,
            shopName: m.shopName,
            managerName: m.managerName,
            phone: m.phone,
            city: m.city,
            pincode: m.pincode,
            address: m.address,
            status: m.status,
            isOnline: m.isOnline,
            isVerified: (m.status as string) === 'active',
            gstin: m.gstin,
            isGstExempt: m.isGstExempt,
            pan: mask(decryptedPan), // Masked for list view
            bankName: m.bankName,
            accountHolder: m.accountHolder,
            accountNumber: mask(decryptedAcc), // Masked for list view
            ifsc: m.ifsc,
            gstCertificate: m.gstCertificate,
            panFront: m.panFront,
            panBack: m.panBack,
            aadharFront: m.aadharFront,
            aadharBack: m.aadharBack,
            items: itemsSoldMap.get(m.id) || 0,
            fullDetails: {
              pan: decryptedPan,
              accountNumber: decryptedAcc,
            },
            createdAt: m.created_at,
            user: {
              id: m.user?.id,
              name: m.user?.name,
              email: m.user?.email,
              avatar: m.user?.avatar,
            },
          };
        }),
        total,
        page,
        limit,
      };
    } catch (error) {
      console.error('CRITICAL ERROR in GetAdminMerchantsUseCase:', error);
      throw error;
    }
  }
}
