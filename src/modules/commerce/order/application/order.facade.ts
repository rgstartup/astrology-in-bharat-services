import { Injectable } from '@nestjs/common';
import { MerchantOrderQueriesUseCase } from './use-cases/merchant-order-queries.use-case';
import { CreateOrderFromCartUseCase } from './use-cases/create-order-from-cart.use-case';
import { MarkOrderAsPaidUseCase } from './use-cases/mark-order-as-paid.use-case';
import { SetOrderRazorpayIdUseCase } from './use-cases/set-order-razorpay-id.use-case';
import { GetUserOrdersUseCase } from './use-cases/get-user-orders.use-case';
import { GetOrderByIdUseCase } from './use-cases/get-order-by-id.use-case';
import { UpdateOrderStatusUseCase } from './use-cases/update-order-status.use-case';
import { CancelUserOrderUseCase } from './use-cases/cancel-user-order.use-case';
import { FindAllOrdersUseCase } from './use-cases/find-all-orders.use-case';
import { GetOrderEarningsUseCase } from './use-cases/get-order-earnings.use-case';
import { GetAdminMerchantSalesOverviewUseCase } from './use-cases/get-admin-merchant-sales-overview.use-case';
import { GetAdminMerchantSalesDetailsUseCase } from './use-cases/get-admin-merchant-sales-details.use-case';
import { OrderStatus } from '../infrastructure/entities/order.entity';
import { CreateOrderDto } from '../api/dto/create-order.dto';
import { QueryRunner } from 'typeorm';
import { WalletFacade } from '@/modules/finance/wallet/application/wallet.facade';

@Injectable()
export class OrderFacade {
  constructor(
    private readonly createOrderFromCartUseCase: CreateOrderFromCartUseCase,
    private readonly markOrderAsPaidUseCase: MarkOrderAsPaidUseCase,
    private readonly setOrderRazorpayIdUseCase: SetOrderRazorpayIdUseCase,
    private readonly getUserOrdersUseCase: GetUserOrdersUseCase,
    private readonly getOrderByIdUseCase: GetOrderByIdUseCase,
    private readonly updateOrderStatusUseCase: UpdateOrderStatusUseCase,
    private readonly cancelUserOrderUseCase: CancelUserOrderUseCase,
    private readonly findAllOrdersUseCase: FindAllOrdersUseCase,
    private readonly getOrderEarningsUseCase: GetOrderEarningsUseCase,
    private readonly merchantOrderQueriesUseCase: MerchantOrderQueriesUseCase,
    private readonly getAdminMerchantSalesOverviewUseCase: GetAdminMerchantSalesOverviewUseCase,
    private readonly getAdminMerchantSalesDetailsUseCase: GetAdminMerchantSalesDetailsUseCase,
  ) {}

  async createOrder(profileId: string, userId: string, dto: CreateOrderDto) {
    if (dto.product_id) {
      // Logic for single product order will be added to the use case
    }
    return this.createOrderFromCartUseCase.execute(profileId, userId, dto);
  }

  async createOrderFromCart(
    profileId: string,
    userId: string,
    shippingAddress: Record<string, unknown>,
  ) {
    return this.createOrderFromCartUseCase.execute(profileId, userId, {
      shipping_address: shippingAddress,
    });
  }

  async markAsPaid(razorpayOrderId: string, externalQueryRunner?: QueryRunner) {
    return this.markOrderAsPaidUseCase.execute(
      razorpayOrderId,
      externalQueryRunner,
    );
  }

  async setRazorpayOrderId(orderId: string, razorpayOrderId: string) {
    return this.setOrderRazorpayIdUseCase.execute(orderId, razorpayOrderId);
  }

  async getUserOrders(
    profileId: string,
    userId: string,
    dto: import('../api/dto/get-my-orders.dto').GetMyOrdersDto,
  ) {
    return this.getUserOrdersUseCase.execute(profileId, userId, dto);
  }

  async getOrderById(id: string, profileId: string) {
    return this.getOrderByIdUseCase.execute(id, profileId);
  }

  async updateOrderStatus(
    id: string,
    status: OrderStatus,
    cancellationReason?: string,
    merchantId?: string,
    user?: any,
  ) {
    return this.updateOrderStatusUseCase.execute(
      id,
      status,
      cancellationReason,
      merchantId,
      user,
    );
  }

  async cancelUserOrder(orderId: string, profileId: string, cancellationReason: string, user: import('@/common/types/access-token.payload').IUser) {
    return this.cancelUserOrderUseCase.execute(orderId, profileId, cancellationReason, user);
  }

  async findAllOrders() {
    return this.findAllOrdersUseCase.execute();
  }

  async getOrderEarnings(dateLimit: Date) {
    return this.getOrderEarningsUseCase.execute(dateLimit);
  }

  async getExpertProductRevenueAndCount(expertProfileId: number) {
    return this.findAllOrdersUseCase.getExpertProductRevenueAndCount(
      expertProfileId,
    );
  }

  async getMerchantTotalOrders(merchantId: string) {
    return this.merchantOrderQueriesUseCase.getMerchantTotalOrders(merchantId);
  }

  async getMerchantGrossTotalEarnings(merchantId: string) {
    return this.merchantOrderQueriesUseCase.getMerchantGrossTotalEarnings(
      merchantId,
    );
  }

  async getMerchantGrossMonthlyEarnings(
    merchantId: string,
    startOfMonth: Date,
  ) {
    return this.merchantOrderQueriesUseCase.getMerchantGrossMonthlyEarnings(
      merchantId,
      startOfMonth,
    );
  }

  async getMerchantOrders(
    merchantId: string,
    filters?: Record<string, unknown>,
  ) {
    return this.merchantOrderQueriesUseCase.getMerchantOrders(
      merchantId,
      filters,
    );
  }

  async getMerchantRecentOrders(merchantId: string, limit: number = 5) {
    return this.merchantOrderQueriesUseCase.getMerchantRecentOrders(
      merchantId,
      limit,
    );
  }

  async sendOrderOtp(orderId: string, merchantId: string) {
    return this.merchantOrderQueriesUseCase.sendOrderOtp(orderId, merchantId);
  }

  async verifyOrderOtp(
    orderId: string,
    otp: string,
    merchantId: string,
    walletFacade: WalletFacade,
  ) {
    return this.merchantOrderQueriesUseCase.verifyOrderOtp(
      orderId,
      otp,
      merchantId,
      walletFacade,
    );
  }

  async getMerchantRevenueTimeline(
    merchantId: string,
  ): Promise<Array<{ date: string; revenue: string }>> {
    return this.merchantOrderQueriesUseCase.getMerchantRevenueTimeline(
      merchantId,
    );
  }

  async getMerchantTopProducts(
    merchantId: string,
  ): Promise<
    Array<{ name: string; sales_count: string; total_revenue: string }>
  > {
    return this.merchantOrderQueriesUseCase.getMerchantTopProducts(merchantId);
  }

  async getMerchantOrdersWithStats(
    merchantId: string,
    page: number,
    limit: number,
    status?: string,
    search?: string,
  ) {
    return this.merchantOrderQueriesUseCase.getMerchantOrdersWithStats(
      merchantId,
      page,
      limit,
      status,
      search,
    );
  }

  async getAdminMerchantSalesOverview() {
    return this.getAdminMerchantSalesOverviewUseCase.execute();
  }

  async getAdminMerchantSalesDetails(merchantId: string) {
    return this.getAdminMerchantSalesDetailsUseCase.execute(merchantId);
  }
}
