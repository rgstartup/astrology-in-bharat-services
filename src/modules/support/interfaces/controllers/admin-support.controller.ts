
import { Controller, Get, Patch, Post, Param, Body, UseGuards, Query } from '@nestjs/common';
import { SupportService } from '../../application/services/support.service';
import { DisputeChatService } from '../../application/services/dispute-chat.service';
import { SendMessageDto } from '../../application/dtos/send-message.dto';
import { UpdateDisputeStatusDto } from '../../application/dtos/update-dispute-status.dto';
import { CloseDisputeDto } from '../../application/dtos/close-dispute.dto';
import { Roles } from '@/common/interfaces/decorators/roles.decorator';
import { JwtAuthGuard } from '@/modules/auth/interfaces/guards/auth.guard';
import { RolesGuard } from '@/modules/auth/interfaces/guards/role.guard';
import { CurrentUser } from '@/common/interfaces/decorators/current-user.decorator';
import { User } from '@/modules/users/domain/entities/user.entity';

@Controller({
    path: 'admin/support',
    version: '1',
})
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminSupportController {
    constructor(
        private readonly supportService: SupportService,
        private readonly chatService: DisputeChatService,
    ) { }

    @Get('disputes')
    async getAllDisputes(
        @Query('page') page: number = 1,
        @Query('limit') limit: number = 10,
        @Query('status') status?: string,
        @Query('priority') priority?: string,
        @Query('type') type?: string,
        @Query('userId') userId?: number,
    ) {
        return this.supportService.getAllDisputes({ status, priority, type, userId }, page, limit);
    }

    @Get('disputes/stats')
    async getStats() {
        return this.supportService.getDisputeStats();
    }

    @Get('disputes/:id')
    async getDisputeById(@Param('id') id: number) {
        const dispute = await this.supportService.getDisputeById(id);

        // Add computed field
        const closedStatuses = ['closed', 'resolved'];
        return {
            ...dispute,
            canSendMessage: !closedStatuses.includes(dispute.status),
        };
    }

    @Patch('disputes/:id/status')
    async updateDisputeStatus(
        @Param('id') id: number,
        @Body() dto: UpdateDisputeStatusDto,
    ) {
        return this.supportService.updateDisputeStatus(id, dto);
    }

    @Patch('disputes/:id/close')
    async closeDispute(
        @Param('id') id: number,
        @Body() dto: CloseDisputeDto,
    ) {
        const dispute = await this.supportService.closeDispute(id, dto.feedback, dto.status);
        return {
            id: dispute.id,
            status: dispute.status,
            adminFeedback: dispute.adminFeedback,
            closedAt: dispute.closedAt,
            message: 'Dispute closed successfully',
        };
    }


    @Get('disputes/:id/messages')
    async getMessages(
        @Param('id') id: number,
        @CurrentUser() user: User,
    ) {
        return this.chatService.getMessages(id, user); // User object needed for checking read/unread context if any
    }

    @Post('disputes/:id/messages')
    async sendMessage(
        @Param('id') id: number,
        @CurrentUser() user: User, // Admin user
        @Body() dto: SendMessageDto,
    ) {
        // Force admin role for messages
        return this.chatService.sendMessage(id, user, dto, false);
    }
}
