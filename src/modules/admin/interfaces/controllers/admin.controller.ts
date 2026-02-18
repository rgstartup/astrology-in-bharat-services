import { Controller, Get, UseGuards, Query, Param, Patch, Body } from '@nestjs/common';
import { Roles } from '@/common/interfaces/decorators/roles.decorator';
import { JwtAuthGuard } from '@/modules/auth/interfaces/guards/auth.guard';
import { RolesGuard } from '@/modules/auth/interfaces/guards/role.guard';
import { AdminService } from '../../application/services/admin.service';

@Controller({
    path: 'admin',
    version: '1',
})
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminController {
    constructor(
        private readonly adminService: AdminService,
    ) { }

    @Get('analytics/user-growth')
    async getUserGrowthStats(@Query('days') days: number = 7) {
        return this.adminService.getUserGrowthStats(days);
    }

    @Get('dashboard/stats')
    async getDashboardStats() {
        return this.adminService.getDashboardStats();
    }

    @Get('experts/stats')
    async getExpertsStats() {
        return this.adminService.getExpertsStats();
    }

    @Get('users/stats')
    async getUserStats() {
        return this.adminService.getUserStats();
    }

    @Get('users')
    async getAllUsers(
        @Query('search') search?: string,
        @Query('page') page: number = 1,
        @Query('limit') limit: number = 10,
    ) {
        return this.adminService.getAllUsers(search, page, limit);
    }

    @Get('experts')
    async getAllExperts(
        @Query('search') search?: string,
        @Query('page') page: number = 1,
        @Query('limit') limit: number = 10,
    ) {
        return this.adminService.getAllExperts(search, page, limit);
    }

    @Get('experts/:id')
    async getExpertDetail(@Param('id') id: number) {
        return this.adminService.getExpertDetail(id);
    }

    @Patch('experts/:id/status')
    async updateExpertStatus(
        @Param('id') id: number,
        @Body() body: { status: string; reason?: string },
    ) {
        return this.adminService.updateExpertStatus(id, body.status, body.reason);
    }

    @Get('users/:id')
    async getUserDetail(@Param('id') id: number) {
        return this.adminService.getUserDetail(id);
    }

    @Patch('users/:id/block')
    async toggleUserBlock(
        @Param('id') id: number,
        @Body('isBlocked') isBlocked: boolean,
    ) {
        return this.adminService.toggleUserBlock(id, isBlocked);
    }

    @Get('live-sessions')
    async getLiveSessions(@Query('type') type?: string) {
        return this.adminService.getLiveSessions(type);
    }

    @Get('live-sessions/:id/history')
    async getChatHistory(@Param('id') id: number) {
        return this.adminService.getChatHistory(id);
    }
}
