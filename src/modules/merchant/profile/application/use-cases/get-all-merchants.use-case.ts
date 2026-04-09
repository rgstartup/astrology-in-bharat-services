import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ProfileMerchant, MerchantStatus } from '../../infrastructure/persistence/entities/profile-merchant.entity';
import { Wishlist } from '@/modules/wishlist/infrastructure/persistence/entities/wishlist.entity';

@Injectable()
export class GetAllMerchantsUseCase {
  constructor(
    @InjectRepository(ProfileMerchant)
    private readonly merchantRepository: Repository<ProfileMerchant>,
    @InjectRepository(Wishlist)
    private readonly wishlistRepository: Repository<Wishlist>,
  ) {}

  async execute(filters: { search?: string; city?: string; page?: number; limit?: number; currentUserId?: number } = {}) {
    const { search, city, page = 1, limit = 10, currentUserId } = filters;
    const skip = (page - 1) * limit;

    const query = this.merchantRepository
      .createQueryBuilder('merchant')
      .leftJoinAndSelect('merchant.user', 'user')
      .where('merchant.status = :status', { status: MerchantStatus.ACTIVE });

    if (city) {
      query.andWhere('merchant.city ILIKE :city', { city: `%${city}%` });
    }

    if (search) {
      query.andWhere(
        '(merchant.shopName ILIKE :search OR merchant.address ILIKE :search OR merchant.description ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    const [merchants, total] = await query
      .orderBy('merchant.created_at', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    // Fetch top 4 active product image URLs per merchant using user_id mapping
    const userIdToProfileId = new Map<number, number>();
    const userIds = merchants
      .map((m) => {
        if (m.user_id) userIdToProfileId.set(m.user_id, m.id);
        return m.user_id;
      })
      .filter((id) => id !== null);

    const productMap = new Map<number, string[]>();

    if (userIds.length > 0) {
      const productsRaw: { merchant_id: number; image_url: string }[] =
        await this.merchantRepository.manager.query(
          `
          SELECT merchant_id, image_url
          FROM (
            SELECT merchant_id, image_url,
                   ROW_NUMBER() OVER (PARTITION BY merchant_id ORDER BY created_at DESC) AS rn
            FROM products
            WHERE merchant_id = ANY($1)
              AND is_active = true
              AND image_url IS NOT NULL
              AND image_url <> ''
          ) ranked
          WHERE rn <= 4
        `,
          [userIds],
        );

      for (const row of productsRaw) {
        const userId = Number(row.merchant_id);
        const profileId = userIdToProfileId.get(userId);
        if (profileId) {
          const arr = productMap.get(profileId) ?? [];
          arr.push(row.image_url);
          productMap.set(profileId, arr);
        }
      }
    }

    // Fetch liked status if currentUserId is provided
    let likedMerchantIds = new Set<number>();
    if (currentUserId) {
      const likes = await this.wishlistRepository.find({
        where: { user: { id: currentUserId }, merchant: { id: In(merchants.map(m => m.id)) } },
        relations: ['merchant'],
      });
      likedMerchantIds = new Set(likes.map(l => l.merchant.id));
    }

    // Fetch likesCount for each merchant using QueryBuilder with property names for safe mapping
    const likesCountRaw = await this.wishlistRepository
      .createQueryBuilder('w')
      .select('w.merchant', 'merchant_id') // Property name 'merchant' maps to the FK
      .addSelect('COUNT(*)', 'count')
      .where('w.merchant IN (:...ids)', {
        ids: merchants.map((m) => m.id),
      })
      .groupBy('w.merchant')
      .getRawMany();

    const likesCountMap = new Map<number, number>();
    for (const row of likesCountRaw) {
      likesCountMap.set(Number(row.merchant_id), Number(row.count));
    }

    const formattedMerchants = merchants.map((m) => ({
      id: m.id,
      name: m.shopName || m.user?.name || 'Unnamed Shop',
      address: m.address || '',
      city: m.city || '',
      pincode: m.pincode || '',
      phone: m.phone || '',
      image: m.user?.avatar || '',
      rating: m.rating ? Number(m.rating) : 0,
      reviewCount: m.reviewCount || 0,
      isTrusted: m.isTrusted || false,
      popularProducts: productMap.get(m.id) ?? [],
      isLiked: likedMerchantIds.has(m.id),
      likesCount: likesCountMap.get(m.id) ?? 0,
    }));

    return {
      merchants: formattedMerchants,
    };
  }
}
