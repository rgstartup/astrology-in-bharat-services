import { 
  Controller, 
  Get, 
  UseGuards, 
  HttpCode, 
  HttpStatus, 
  Patch, 
  Body, 
  UseInterceptors, 
  UploadedFiles 
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '@/modules/auth/api/guards/auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { GetMerchantStatsUseCase } from '../../application/use-cases/get-merchant-stats.usecase';
import { GetRecentOrdersUseCase } from '../../application/use-cases/get-recent-orders.usecase';
import { GetMerchantActivityUseCase } from '../../application/use-cases/get-merchant-activity.usecase';
import { GetMerchantPerformanceUseCase } from '../../application/use-cases/get-merchant-performance.usecase';
import { GetMerchantProfileByUserIdUseCase } from '../../../profile/application/use-cases/get-merchant-profile-by-userid.usecase';
import { UpdateMerchantProfileUseCase } from '../../../profile/application/use-cases/update-merchant-profile.usecase';
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
    private readonly getActivity: GetMerchantActivityUseCase,
    private readonly getPerformance: GetMerchantPerformanceUseCase,
    private readonly getProfile: GetMerchantProfileByUserIdUseCase,
    private readonly updateProfile: UpdateMerchantProfileUseCase,
  ) {}

  @Get('stats')
  @HttpCode(HttpStatus.OK)
  async stats(@CurrentUser('id') userId: number) {
    return this.getStats.execute(userId);
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
