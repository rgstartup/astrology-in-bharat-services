import {
  Injectable,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderItem } from '@/modules/commerce/order/infrastructure/entities/order-item.entity';
import { OrderStatus } from '@/modules/commerce/order/infrastructure/entities/order.entity';
import { MerchantProfileFacade } from '@/modules/merchant/profile/application/profile.facade';

@Injectable()
export class GetAdminMerchantSalesDetailsUseCase {
  constructor(
    @Inject(forwardRef(() => MerchantProfileFacade))
    private readonly merchantFacade: MerchantProfileFacade,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
  ) {}

  async execute(merchantId: string) {
    try {
      // 1. Verify merchant exists and get their user_id
      const merchant = await this.merchantFacade.getProfileById(merchantId);

      if (!merchant) {
        throw new NotFoundException(`Merchant with ID ${merchantId} not found`);
      }

      // 2. Fetch all order items for this merchant's products
      const items = await this.orderItemRepository
        .createQueryBuilder('item')
        .leftJoinAndSelect('item.product', 'product')
        .leftJoinAndSelect('item.order', 'order')
        .leftJoinAndSelect('order.client', 'client')
        .where('product.merchant_id = :userId', { userId: merchant.user_id })
        .andWhere('order.status NOT IN (:...invalidStatuses)', {
          invalidStatuses: [OrderStatus.CANCELLED, OrderStatus.PENDING],
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
            id: item.order?.client?.id,
            name: item.order?.client?.name,
            phone: item.order?.client?.phone || 'N/A',
            email: item.order?.client?.email,
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
