import {
  Controller,
  Get,
  Post,
  Patch,
  UseGuards,
  HttpCode,
  HttpStatus,
  Query,
  DefaultValuePipe,
  ParseUUIDPipe,
  Param,
  Body,
  UseInterceptors,
  UploadedFiles,
  ParseEnumPipe,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '@/modules/auth/api/guards/auth.guard';
import { RolesGuard } from '@/modules/auth/api/guards/role.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { GetMerchantStatsUseCase } from '../../application/use-cases/get-merchant-stats.usecase';
import { GetRecentOrdersUseCase } from '../../application/use-cases/get-recent-orders.usecase';
import { GetMerchantOrdersUseCase } from '../../application/use-cases/get-merchant-orders.usecase';
import { GetMerchantActivityUseCase } from '../../application/use-cases/get-merchant-activity.usecase';
import { GetMerchantPerformanceUseCase } from '../../application/use-cases/get-merchant-performance.usecase';
import { GetMerchantAnalyticsUseCase } from '../../application/use-cases/get-merchant-analytics.usecase';
import { SendOrderOtpUseCase } from '../../application/use-cases/send-order-otp.usecase';
import { VerifyOrderOtpUseCase } from '../../application/use-cases/verify-order-otp.usecase';
import { GetMerchantTransactionsUseCase } from '../../application/use-cases/get-merchant-transactions.usecase';
import { OrderFacade } from '@/modules/commerce/order/application/order.facade';
import { OrderStatus } from '@/modules/commerce/order/infrastructure/entities/order.entity';

@Controller({
  path: 'merchant',
  version: '1',
})
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('MERCHANT', 'AGENT', 'EXPERT')
export class MerchantDashboardController {
  constructor(
    private readonly getStats: GetMerchantStatsUseCase,
    private readonly getRecentOrders: GetRecentOrdersUseCase,
    private readonly getAllOrders: GetMerchantOrdersUseCase,
    private readonly getActivity: GetMerchantActivityUseCase,
    private readonly getPerformance: GetMerchantPerformanceUseCase,
    private readonly getAnalytics: GetMerchantAnalyticsUseCase,
    private readonly getTransactions: GetMerchantTransactionsUseCase,
    private readonly sendOtp: SendOrderOtpUseCase,
    private readonly verifyOtp: VerifyOrderOtpUseCase,
    private readonly orderFacade: OrderFacade,
  ) {}

  @Get('stats')
  @HttpCode(HttpStatus.OK)
  async stats(@CurrentUser('id') userId: string) {
    const stats = await this.getStats.execute(userId as any);
    return { success: true, data: stats };
  }


  @Get('orders')
  @HttpCode(HttpStatus.OK)
  async orders(
    @CurrentUser('id') userId: string,
    @Query('page', new DefaultValuePipe(1), ParseUUIDPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(10), ParseUUIDPipe) limit: number = 10,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    const orders = await this.getAllOrders.execute(userId, page, limit, status, search);
    return { success: true, data: orders };
  }

  @Get('orders/recent')
  @HttpCode(HttpStatus.OK)
  async recentOrders(@CurrentUser('id') userId: string) {
    const orders = await this.getRecentOrders.execute(userId as any);
    return { success: true, data: orders };
  }

  @Get('activity')
  @HttpCode(HttpStatus.OK)
  async activity(@CurrentUser('id') userId: string) {
    const activity = await this.getActivity.execute(userId as any);
    return { success: true, data: activity };
  }

  @Get('performance')
  @HttpCode(HttpStatus.OK)
  async performance(@CurrentUser('id') userId: string) {
    const performance = await this.getPerformance.execute(userId as any);
    return { success: true, data: performance };
  }

  @Get('analytics')
  @HttpCode(HttpStatus.OK)
  async analytics(@CurrentUser('id') userId: string) {
    const analytics = await this.getAnalytics.execute(userId as any);
    return { success: true, data: analytics };
  }

  @Post('orders/:id/send-otp')
  @HttpCode(HttpStatus.OK)
  async sendOrderOtp(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) orderId: number,
  ) {
    return this.sendOtp.execute(userId as any, orderId);
  }

  @Post('orders/:id/verify-otp')
  @HttpCode(HttpStatus.OK)
  async verifyOrderOtp(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) orderId: number,
    @Body('otp') otp: string,
  ) {
    return this.verifyOtp.execute(userId as any, orderId, otp);
  }

  @Patch('orders/:id/status')
  @HttpCode(HttpStatus.OK)
  async updateStatus(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status', new ParseEnumPipe(OrderStatus)) status: OrderStatus,
    @Body('cancellationReason') cancellationReason?: string,
  ) {
    const order = await this.orderFacade.updateOrderStatus(id, status, cancellationReason, userId as any);
    return { success: true, data: order };
  }

}
