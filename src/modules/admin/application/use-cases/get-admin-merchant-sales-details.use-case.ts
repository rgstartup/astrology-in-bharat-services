import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderItem } from '@/modules/order/infrastructure/persistence/entities/order-item.entity';
import { ProfileMerchant } from '@/modules/merchant/profile/infrastructure/persistence/entities/profile-merchant.entity';
import { OrderStatus } from '@/modules/order/infrastructure/persistence/entities/order.entity';

@Injectable()
export class GetAdminMerchantSalesDetailsUseCase {
  constructor(
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    @InjectRepository(ProfileMerchant)
    private readonly merchantRepository: Repository<ProfileMerchant>,
  ) {}

  async execute(merchantId: number) {
    try {
      // 1. Verify merchant exists and get their user_id
      const merchant = await this.merchantRepository.findOne({
        where: { id: merchantId },
        relations: ['user'],
      });

      if (!merchant) {
        throw new NotFoundException(`Merchant with ID ${merchantId} not found`);
      }

      // 2. Fetch all order items for this merchant's products
      const items = await this.orderItemRepository
        .createQueryBuilder('item')
        .leftJoinAndSelect('item.product', 'product')
        .leftJoinAndSelect('item.order', 'order')
        .leftJoinAndSelect('order.user', 'customer')
        .leftJoinAndSelect('customer.profile_client', 'pClient')
        .where('product.merchant_id = :userId', { userId: merchant.user_id })
        .andWhere('order.status NOT IN (:...invalidStatuses)', {
          invalidStatuses: [OrderStatus.CANCELLED, OrderStatus.PENDING]
        })
        .orderBy('order.created_at', 'DESC')
        .getMany();

      // 3. Return formatted details
      return {
        merchant: {
          id: merchant.id,
          shopName: merchant.shopName,
          managerName: merchant.managerName,
          city: merchant.city,
        },
        sales: items.map((item) => ({
          id: item.id,
          orderId: item.order_id,
          product: {
            id: item.product?.id,
            name: item.product?.name,
            sku: item.product?.sku,
            price: Number(item.price),
          },
          quantity: item.quantity,
          totalPrice: Number(item.price) * item.quantity,
          customer: {
            id: item.order?.user?.id,
            name: item.order?.user?.name,
            phone: item.order?.user?.profile_client?.phone || 'N/A',
            email: item.order?.user?.email,
          },
          status: item.order?.status,
          date: item.order?.created_at,
        })),
      };
    } catch (error) {
      console.error('Error in GetAdminMerchantSalesDetailsUseCase:', error);
      throw error;
    }
  }
}
