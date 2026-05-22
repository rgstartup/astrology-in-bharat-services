import { Injectable } from '@nestjs/common';
import { CreateOrderFromCartUseCase } from './use-cases/create-order-from-cart.use-case';
import { MarkOrderAsPaidUseCase } from './use-cases/mark-order-as-paid.use-case';
import { SetOrderRazorpayIdUseCase } from './use-cases/set-order-razorpay-id.use-case';
import { GetUserOrdersUseCase } from './use-cases/get-user-orders.use-case';
import { GetOrderByIdUseCase } from './use-cases/get-order-by-id.use-case';
import { UpdateOrderStatusUseCase } from './use-cases/update-order-status.use-case';
import { FindAllOrdersUseCase } from './use-cases/find-all-orders.use-case';
import { OrderStatus } from '../infrastructure/entities/order.entity';

@Injectable()
export class OrderFacade {
  constructor(
    private readonly createOrderFromCartUseCase: CreateOrderFromCartUseCase,
    private readonly markOrderAsPaidUseCase: MarkOrderAsPaidUseCase,
    private readonly setOrderRazorpayIdUseCase: SetOrderRazorpayIdUseCase,
    private readonly getUserOrdersUseCase: GetUserOrdersUseCase,
    private readonly getOrderByIdUseCase: GetOrderByIdUseCase,
    private readonly updateOrderStatusUseCase: UpdateOrderStatusUseCase,
    private readonly findAllOrdersUseCase: FindAllOrdersUseCase,
  ) { }

  async createOrder(userId: number, dto: any) {
    if (dto.product_id) {
      // Logic for single product order will be added to the use case
    }
    return this.createOrderFromCartUseCase.execute(userId, dto);
  }

  async createOrderFromCart(userId: number, shippingAddress: any) {
    return this.createOrderFromCartUseCase.execute(userId, { shipping_address: shippingAddress });
  }

  async markAsPaid(razorpayOrderId: string, externalQueryRunner?: any) {
    return this.markOrderAsPaidUseCase.execute(razorpayOrderId, externalQueryRunner);
  }

  async setRazorpayOrderId(orderId: number, razorpayOrderId: string) {
    return this.setOrderRazorpayIdUseCase.execute(orderId, razorpayOrderId);
  }

  async getUserOrders(userId: number, limit?: number, offset?: number) {
    return this.getUserOrdersUseCase.execute(userId, limit, offset);
  }

  async getOrderById(id: string, userId: number) {
    return this.getOrderByIdUseCase.execute(id, userId);
  }

  async updateOrderStatus(id: string, status: OrderStatus, cancellationReason?: string, merchantId?: number) {
    return this.updateOrderStatusUseCase.execute(id, status, cancellationReason, merchantId);
  }

  async findAllOrders() {
    return this.findAllOrdersUseCase.execute();
  }

  async getExpertProductRevenueAndCount(expertProfileId: number) {
    return this.findAllOrdersUseCase.getExpertProductRevenueAndCount(expertProfileId);
  }
}
