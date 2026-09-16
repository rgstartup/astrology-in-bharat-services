import {
  Controller,
  Get,
  Post,
  Patch,
  UseGuards,
  HttpCode,
  HttpStatus,
  Query,
  Param,
  Body,
  ParseIntPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '@/modules/auth/guards/auth.guard';
import { RolesGuard } from '@/modules/auth/guards/role.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { GetMerchantStatsUseCase } from '../use-cases/get-merchant-stats.usecase';
import { GetRecentOrdersUseCase } from '../use-cases/get-recent-orders.usecase';
import { GetMerchantOrdersUseCase } from '../use-cases/get-merchant-orders.usecase';
import { GetMerchantActivityUseCase } from '../use-cases/get-merchant-activity.usecase';
import { GetMerchantPerformanceUseCase } from '../use-cases/get-merchant-performance.usecase';
import { GetMerchantAnalyticsUseCase } from '../use-cases/get-merchant-analytics.usecase';
import { SendOrderOtpUseCase } from '../use-cases/send-order-otp.usecase';
import { VerifyOrderOtpUseCase } from '../use-cases/verify-order-otp.usecase';
import { OrderFacade } from '@/modules/commerce/order/order.facade';
import { GetMerchantOrdersDto } from '../dto/get-merchant-orders.dto';
import { UpdateMerchantOrderStatusDto } from '../dto/update-merchant-order-status.dto';

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
    private readonly sendOtp: SendOrderOtpUseCase,
    private readonly verifyOtp: VerifyOrderOtpUseCase,
    private readonly orderFacade: OrderFacade,
  ) {}

  @Get('stats')
  @HttpCode(HttpStatus.OK)
  async stats(@CurrentUser('id') userId: number) {
    const stats = await this.getStats.execute(userId);
    return { success: true, data: stats };
  }

  @Get('orders')
  @HttpCode(HttpStatus.OK)
  async orders(
    @CurrentUser('id') userId: number,
    @Query() dto: GetMerchantOrdersDto,
  ) {
    const orders = await this.getAllOrders.execute(userId, dto);
    return { success: true, data: orders };
  }

  @Get('orders/recent')
  @HttpCode(HttpStatus.OK)
  async recentOrders(@CurrentUser('id') userId: number) {
    const orders = await this.getRecentOrders.execute(userId);
    return { success: true, data: orders };
  }

  @Get('activity')
  @HttpCode(HttpStatus.OK)
  async activity(@CurrentUser('id') userId: number) {
    const activity = await this.getActivity.execute(userId);
    return { success: true, data: activity };
  }

  @Get('performance')
  @HttpCode(HttpStatus.OK)
  async performance(@CurrentUser('id') userId: number) {
    const performance = await this.getPerformance.execute(userId);
    return { success: true, data: performance };
  }

  @Get('analytics')
  @HttpCode(HttpStatus.OK)
  async analytics(@CurrentUser('id') userId: number) {
    const analytics = await this.getAnalytics.execute(userId);
    return { success: true, data: analytics };
  }

  @Post('orders/:id/send-otp')
  @HttpCode(HttpStatus.OK)
  async sendOrderOtp(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) orderId: number,
  ) {
    return this.sendOtp.execute(userId, orderId);
  }

  @Post('orders/:id/verify-otp')
  @HttpCode(HttpStatus.OK)
  async verifyOrderOtp(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) orderId: number,
    @Body('otp') otp: string,
  ) {
    return this.verifyOtp.execute(userId, orderId, otp);
  }

  @Patch('orders/:id/status')
  @HttpCode(HttpStatus.OK)
  async updateStatus(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMerchantOrderStatusDto,
  ) {
    await this.orderFacade.updateOrderStatus(
      id,
      dto.status,
      dto.cancellationReason,
      userId,
    );
    return { success: true };
  }
}
