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
  ParseIntPipe,
  Param,
  Body,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '@/modules/auth/api/guards/auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { GetMerchantStatsUseCase } from '../../application/use-cases/get-merchant-stats.usecase';
import { GetRecentOrdersUseCase } from '../../application/use-cases/get-recent-orders.usecase';
import { GetMerchantOrdersUseCase } from '../../application/use-cases/get-merchant-orders.usecase';
import { GetMerchantActivityUseCase } from '../../application/use-cases/get-merchant-activity.usecase';
import { GetMerchantPerformanceUseCase } from '../../application/use-cases/get-merchant-performance.usecase';
import { VerifyOrderOtpUseCase } from '../../application/use-cases/verify-order-otp.usecase';
import { OrderFacade } from '@/modules/order/application/order.facade';
import { OrderStatus } from '@/modules/order/infrastructure/persistence/entities/order.entity';
import { GetMerchantProfileUseCase } from '../../../profile/application/use-cases/get-merchant-profile.use-case';
import { UpdateMerchantProfileUseCase } from '../../../profile/application/use-cases/update-merchant-profile.use-case';
import { UpdateMerchantProfileDto } from '../../../profile/api/dto/update-merchant-profile.dto';

@Controller({
  path: 'merchant',
  version: '1',
})
@UseGuards(JwtAuthGuard)
export class MerchantDashboardController {
  constructor(
    private readonly getStats: GetMerchantStatsUseCase,
    private readonly getRecentOrders: GetRecentOrdersUseCase,
    private readonly getAllOrders: GetMerchantOrdersUseCase,
    private readonly getActivity: GetMerchantActivityUseCase,
    private readonly getPerformance: GetMerchantPerformanceUseCase,
    private readonly verifyOtp: VerifyOrderOtpUseCase,
    private readonly orderFacade: OrderFacade,
    private readonly getProfile: GetMerchantProfileUseCase,
    private readonly updateProfile: UpdateMerchantProfileUseCase,
  ) {}

  @Get('stats')
  @HttpCode(HttpStatus.OK)
  async stats(@CurrentUser('id') userId: number) {
    return this.getStats.execute(userId);
  }

  @Get('debug-whoami')
  @HttpCode(HttpStatus.OK)
  async debugWhoAmI(@CurrentUser() user: any) {
    return {
      userId: user.id,
      role: user.role,
      roles: user.roles,
    };
  }

  @Get('orders')
  @HttpCode(HttpStatus.OK)
  async orders(
    @CurrentUser('id') userId: number,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number = 10,
  ) {
    return this.getAllOrders.execute(userId, page, limit);
  }

  @Get('orders/recent')
  @HttpCode(HttpStatus.OK)
  async recentOrders(@CurrentUser('id') userId: number) {
    return this.getRecentOrders.execute(userId);
  }

  @Get('activity')
  @HttpCode(HttpStatus.OK)
  async activity(@CurrentUser('id') userId: number) {
    return this.getActivity.execute(userId);
  }

  @Get('performance')
  @HttpCode(HttpStatus.OK)
  async performance(@CurrentUser('id') userId: number) {
    return this.getPerformance.execute(userId);
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
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: OrderStatus,
    @Body('cancellationReason') cancellationReason?: string,
  ) {
    return this.orderFacade.updateOrderStatus(id, status, cancellationReason);
  }

  @Get('profile')
  @HttpCode(HttpStatus.OK)
  async getMerchantProfile(@CurrentUser('id') userId: number) {
    const profile = await this.getProfile.execute(userId);
    return {
      success: true,
      data: profile,
    };
  }

  @Patch('profile')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'image', maxCount: 1 },
      { name: 'video', maxCount: 1 },
    ]),
  )
  async updateMerchantProfile(
    @CurrentUser('id') userId: number,
    @Body() dto: UpdateMerchantProfileDto,
    @UploadedFiles() files: { image?: Express.Multer.File[]; video?: Express.Multer.File[] },
  ) {
    const profile = await this.updateProfile.execute(userId, dto, files);
    return {
      success: true,
      message: 'Profile updated successfully',
      data: profile,
    };
  }
}
