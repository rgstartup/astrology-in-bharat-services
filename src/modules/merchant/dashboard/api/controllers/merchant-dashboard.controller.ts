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
  ParseIntPipe,
} from '@nestjs/common';
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
import { OrderFacade } from '@/modules/commerce/order/application/order.facade';
import { OrderStatus } from '@/modules/commerce/order/infrastructure/entities/order.entity';
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
  async stats(@CurrentUser('id') userId: string) {
    const stats = await this.getStats.execute(userId);
    return { success: true, data: stats };
  }

  @Get('orders')
  @HttpCode(HttpStatus.OK)
  async orders(
    @CurrentUser('id') userId: string,
    @Query() dto: GetMerchantOrdersDto,
  ) {
    const orders = await this.getAllOrders.execute(userId, dto);
    return { success: true, data: orders };
  }

  @Get('orders/recent')
  @HttpCode(HttpStatus.OK)
  async recentOrders(@CurrentUser('id') userId: string) {
    const orders = await this.getRecentOrders.execute(userId);
    return { success: true, data: orders };
  }

  @Get('activity')
  @HttpCode(HttpStatus.OK)
  async activity(@CurrentUser('id') userId: string) {
    const activity = await this.getActivity.execute(userId);
    return { success: true, data: activity };
  }

  @Get('performance')
  @HttpCode(HttpStatus.OK)
  async performance(@CurrentUser('id') userId: string) {
    const performance = await this.getPerformance.execute(userId);
    return { success: true, data: performance };
  }

  @Get('analytics')
  @HttpCode(HttpStatus.OK)
  async analytics(@CurrentUser('id') userId: string) {
    const analytics = await this.getAnalytics.execute(userId);
    return { success: true, data: analytics };
  }

  @Post('orders/:id/send-otp')
  @HttpCode(HttpStatus.OK)
  async sendOrderOtp(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) orderId: string,
  ) {
    return this.sendOtp.execute(userId, orderId);
  }

  @Post('orders/:id/verify-otp')
  @HttpCode(HttpStatus.OK)
  async verifyOrderOtp(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) orderId: string,
    @Body('otp') otp: string,
  ) {
    return this.verifyOtp.execute(userId, orderId, otp);
  }

  @Patch('orders/:id/status')
  @HttpCode(HttpStatus.OK)
  async updateStatus(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
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
