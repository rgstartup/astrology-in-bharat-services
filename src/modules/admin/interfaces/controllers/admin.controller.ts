import { Controller, Get, UseGuards, Query, Param, Patch, Body, UseInterceptors, UploadedFiles, Post } from '@nestjs/common';
import { Roles } from '@/common/interfaces/decorators/roles.decorator';
import { JwtAuthGuard } from '@/modules/auth/interfaces/guards/auth.guard';
import { RolesGuard } from '@/modules/auth/interfaces/guards/role.guard';
import { AdminService } from '../../application/services/admin.service';
import { AgentService } from '@/modules/agent/application/services/agent.service';
import { CreateAgentDto } from '@/modules/agent/application/dtos/create-agent.dto';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiOperation } from '@nestjs/swagger';


@Controller({
    path: 'admin',
    version: '1',
})
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminController {
    constructor(
        private readonly adminService: AdminService,
        private readonly agentService: AgentService,
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

    // --- Agent Management ---

    @Post('agents')
    @UseInterceptors(FileFieldsInterceptor([
        { name: 'aadhaar_doc', maxCount: 1 },
        { name: 'pan_doc', maxCount: 1 },
        { name: 'profile_pic', maxCount: 1 },
    ]))
    @ApiConsumes('multipart/form-data')
    @ApiOperation({ summary: 'Create a new agent' })
    async createAgent(
        @Body() dto: CreateAgentDto,
        @UploadedFiles() files: { aadhaar_doc?: Express.Multer.File[], pan_doc?: Express.Multer.File[], profile_pic?: Express.Multer.File[] }
    ) {
        return this.agentService.createAgent(dto, files);
    }

    @Roles('admin')
    @Post('agents/send-otp')
    @ApiOperation({ summary: 'Send OTP to agent email for verification' })
    async sendAgentOtp(@Body('email') email: string) {
        return this.agentService.sendOtp(email);
    }

    @Roles('admin')
    @Post('agents/verify-otp')
    @ApiOperation({ summary: 'Verify agent email OTP' })
    async verifyAgentOtp(@Body('email') email: string, @Body('otp') otp: string) {
        return this.agentService.verifyOtp(email, otp);
    }

    @Get('agents')
    @ApiOperation({ summary: 'Get all agents' })
    async getAllAgents(
        @Query('search') search?: string,
        @Query('page') page: number = 1,
        @Query('limit') limit: number = 10,
        @Query('status') status?: string,
    ) {
        return this.agentService.getAllAgents(search, page, limit, status);
    }

    @Get('agents/stats')
    @ApiOperation({ summary: 'Get agent statistics' })
    async getAgentStats() {
        return this.agentService.getAgentStats();
    }

    @Patch('agents/:id')
    @ApiOperation({ summary: 'Update agent details or status' })
    async updateAgent(
        @Param('id') id: string,
        @Body() updateData: any
    ) {
        return this.agentService.updateAgent(id, updateData);
    }

    @Get('agents/:id')
    @ApiOperation({ summary: 'Get agent details' })
    async getAgentById(@Param('id') id: string) {
        return this.agentService.getAgentById(id);
    }
}

