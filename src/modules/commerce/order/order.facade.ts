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
import { OrderStatus } from './entities/order.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { QueryRunner } from 'typeorm';
import { WalletFacade } from '@/modules/finance/wallet/wallet.facade';

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

  async createOrder(profileId: number, userId: number, dto: CreateOrderDto) {
    if (dto.product_id) {
      // Logic for single product order will be added to the use case
    }
    return this.createOrderFromCartUseCase.execute(profileId, userId, dto);
  }

  async createOrderFromCart(
    profileId: number,
    userId: number,
    shippingAddress: Record<string, unknown>,
  ) {
    return this.createOrderFromCartUseCase.execute(profileId, userId, {
      shipping_address: shippingAddress as any,
    });
  }

  async markAsPaid(razorpayOrderId: string, externalQueryRunner?: QueryRunner) {
    return this.markOrderAsPaidUseCase.execute(
      razorpayOrderId,
      externalQueryRunner,
    );
  }

  async setRazorpayOrderId(
    orderId: number,
    razorpayOrderId: string,
    queryRunner?: import('typeorm').QueryRunner,
  ) {
    return this.setOrderRazorpayIdUseCase.execute(
      orderId,
      razorpayOrderId,
      queryRunner,
    );
  }

  async getUserOrders(
    profileId: number,
    userId: number,
    dto: import('./dto/get-my-orders.dto').GetMyOrdersDto,
  ) {
    return this.getUserOrdersUseCase.execute(profileId, userId, dto);
  }

  async getOrderById(id: number, profileId: number) {
    return this.getOrderByIdUseCase.execute(id, profileId);
  }

  async updateOrderStatus(
    id: number,
    status: OrderStatus,
    cancellationReason?: string,
    merchantId?: number,
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

  async cancelUserOrder(
    orderId: number,
    profileId: number,
    cancellationReason: string,
    user: import('@/common/types/access-token.payload').IUser,
  ) {
    return this.cancelUserOrderUseCase.execute(
      orderId,
      profileId,
      cancellationReason,
      user,
    );
  }

  async findAllOrders() {
    return this.findAllOrdersUseCase.execute();
  }

  async getSuccessfulOrdersCount() {
    return this.findAllOrdersUseCase.getSuccessfulOrdersCount();
  }

  async getOrderEarnings(dateLimit: Date) {
    return this.getOrderEarningsUseCase.execute(dateLimit);
  }

  async getExpertProductRevenueAndCount(expertProfileId: number) {
    return this.findAllOrdersUseCase.getExpertProductRevenueAndCount(
      expertProfileId,
    );
  }

  async getMerchantTotalOrders(merchantId: number) {
    return this.merchantOrderQueriesUseCase.getMerchantTotalOrders(merchantId);
  }

  async getMerchantGrossTotalEarnings(merchantId: number) {
    return this.merchantOrderQueriesUseCase.getMerchantGrossTotalEarnings(
      merchantId,
    );
  }

  async getMerchantGrossMonthlyEarnings(
    merchantId: number,
    startOfMonth: Date,
    endDate?: Date,
  ) {
    return this.merchantOrderQueriesUseCase.getMerchantGrossMonthlyEarnings(
      merchantId,
      startOfMonth,
      endDate,
    );
  }

  async getMerchantOrders(
    merchantId: number,
    filters?: Record<string, unknown>,
  ) {
    return this.merchantOrderQueriesUseCase.getMerchantOrders(
      merchantId,
      filters,
    );
  }

  async getMerchantRecentOrders(merchantId: number, limit: number = 5) {
    return this.merchantOrderQueriesUseCase.getMerchantRecentOrders(
      merchantId,
      limit,
    );
  }

  async sendOrderOtp(orderId: number, merchantId: number) {
    return this.merchantOrderQueriesUseCase.sendOrderOtp(orderId, merchantId);
  }

  async verifyOrderOtp(orderId: number, otp: string, merchantId: number) {
    return this.merchantOrderQueriesUseCase.verifyOrderOtp(
      orderId,
      otp,
      merchantId,
    );
  }

  async getMerchantRevenueTimeline(
    merchantId: number,
  ): Promise<Array<{ date: string; revenue: string }>> {
    return this.merchantOrderQueriesUseCase.getMerchantRevenueTimeline(
      merchantId,
    );
  }

  async getMerchantTopProducts(
    merchantId: number,
  ): Promise<
    Array<{ name: string; sales_count: string; total_revenue: string }>
  > {
    return this.merchantOrderQueriesUseCase.getMerchantTopProducts(merchantId);
  }

  async getMerchantOrdersWithStats(
    merchantId: number,
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

  async getAdminMerchantSalesDetails(merchantId: number) {
    return this.getAdminMerchantSalesDetailsUseCase.execute(merchantId);
  }
}
