import { Controller, Get, UseGuards, Query, Param, NotFoundException, Patch, Body } from '@nestjs/common';
import { UsersService } from '@/modules/users/users.service';
import { WalletService } from '@/modules/wallet/wallet.service';
import { ProfileService } from '@/modules/expert/profile/profile.service';
import { Roles } from '@/common/decorators/roles.decorator';
import { RolesGuard } from '@/modules/auth/guards/role.guard';
import { JwtAuthGuard } from '@/modules/auth/guards/auth.guard';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminController {
  constructor(
    private readonly usersService: UsersService,
    private readonly walletService: WalletService,
    private readonly profileService: ProfileService,
  ) { }

  @Get('experts/stats')
  async getExpertsStats() {
    return this.usersService.getExpertStats();
  }

  @Get('users/stats')
  async getUserStats() {
    return this.usersService.getUserStats();
  }

  @Get('users')
  async getAllUsers(
    @Query('search') search?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.usersService.findAllByRole('client', search, page, limit);
  }

  @Get('experts')
  async getAllExperts(
    @Query('search') search?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.usersService.findAllByRole('expert', search, page, limit);
  }

  @Get('experts/:id')
  async getExpertDetail(@Param('id') id: number) {
    const user = await this.usersService.findById(id);
    if (!user.profile_expert) {
      throw new NotFoundException('Expert profile not found for this user');
    }

    const profile = user.profile_expert;
    const totalEarnings = await this.walletService.getTotalEarnings(user.id);

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      gender: profile.gender,
      dob: profile.date_of_birth ? new Date(profile.date_of_birth).toISOString() : null,
      phone: profile.phoneNumber || user.profile_client?.phone || '',
      languages: profile.languages ? profile.languages.split(',') : [],
      bio: profile.bio || '',
      experience: profile.experience_in_years,
      specialization: profile.specialization || '',
      rating: profile.rating,
      consultationCount: profile.consultationCount,
      totalEarnings: totalEarnings,
      intro_video_url: profile.video || (profile.videos && profile.videos.length > 0 ? profile.videos[0] : ''),
      gallery: profile.gallery || [],
      documents: profile.documents || [],
      addresses: profile.addresses?.map(addr => ({
        houseNo: addr.houseNo || '',
        district: addr.district || '',
        city: addr.city || '',
        state: addr.state || '',
        country: addr.country || '',
        pincode: addr.pincode || addr.zipCode || ''
      })) || [],
      kyc_details: {
        status: profile.kycStatus,
        reason: profile.rejectionReason,
      },
    };
  }

  @Patch('experts/:id/status')
  async updateExpertStatus(
    @Param('id') id: number,
    @Body() body: { status: string; reason?: string },
  ) {
    return this.profileService.updateKycStatus(id, body.status, body.reason);
  }

  @Patch('users/:id/block')
  async toggleUserBlock(
    @Param('id') id: number,
    @Body('isBlocked') isBlocked: boolean,
  ) {
    return this.usersService.update(id, { isBlocked });
  }
}
