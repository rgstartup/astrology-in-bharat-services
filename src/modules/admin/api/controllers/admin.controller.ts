import { Controller, Get, UseGuards, Query, Param, Patch, Body } from '@nestjs/common';
import { UsersFacade } from '@/modules/users/application/users.facade';
import { ProfileFacade } from '@/modules/expert/profile/application/profile.facade';
import { AdminFacade } from '../../application/admin.facade';
import { Roles } from '@/common/decorators/roles.decorator';
import { RolesGuard } from '@/modules/auth/api/guards/role.guard';
import { JwtAuthGuard } from '@/modules/auth/api/guards/auth.guard';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminController {
  constructor(
    private readonly adminFacade: AdminFacade,
    private readonly usersFacade: UsersFacade,
    private readonly profileFacade: ProfileFacade,
  ) { }

  @Get('analytics/user-growth')
  async getUserGrowthStats(@Query('days') days: number = 7) {
    return this.adminFacade.getUserGrowthStats(days);
  }

  @Get('dashboard/stats')
  async getDashboardStats() {
    return this.adminFacade.getDashboardStats();
  }

  @Get('experts/stats')
  async getExpertsStats() {
    return this.usersFacade.getExpertStats();
  }

  @Get('users/stats')
  async getUserStats() {
    return this.usersFacade.getUserStats();
  }

  @Get('users')
  async getAllUsers(
    @Query('search') search?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.usersFacade.findAllByRole('client', search, page, limit);
  }

  @Get('experts')
  async getAllExperts(
    @Query('search') search?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.usersFacade.findAllByRole('expert', search, page, limit);
  }

  @Get('experts/:id')
  async getExpertDetail(@Param('id') id: number) {
    return this.adminFacade.getExpertDetail(id);
  }

  @Patch('experts/:id/status')
  async updateExpertStatus(
    @Param('id') id: number,
    @Body() body: { status: string; reason?: string },
  ) {
    return this.profileFacade.updateKycStatus(id, body.status, body.reason);
  }

  @Patch('users/:id/block')
  async toggleUserBlock(
    @Param('id') id: number,
    @Body('is_blocked') is_blocked: boolean,
  ) {
    return this.usersFacade.update(id, { is_blocked });
  }
}
