
import { Controller, Post, Body, UseGuards, Get, Query, Param, Patch, ForbiddenException } from '@nestjs/common';
import { SupportService } from '../../application/services/support.service';
import { DisputeChatService } from '../../application/services/dispute-chat.service';
import { CreateDisputeDto } from '../../application/dtos/create-dispute.dto';
import { SendMessageDto } from '../../application/dtos/send-message.dto';
import { RequestCloseDisputeDto } from '../../application/dtos/request-close-dispute.dto';
import { JwtAuthGuard } from '@/modules/auth/interfaces/guards/auth.guard';
import { CurrentUser } from '@/common/interfaces/decorators/current-user.decorator';
import { User } from '@/modules/users/domain/entities/user.entity';

@Controller({
    path: 'support',
    version: '1',
})
@UseGuards(JwtAuthGuard)
export class SupportController {
    constructor(
        private readonly supportService: SupportService,
        private readonly chatService: DisputeChatService,
    ) { }

    @Post('disputes')
    async createDispute(
        @CurrentUser() user: User,
        @Body() dto: CreateDisputeDto,
    ) {
        const dispute = await this.supportService.createDispute(user.id, dto);
        return {
            message: 'Issue reported successfully!',
            dispute,
        };
    }

    @Get('disputes')
    async getMyDisputes(
        @CurrentUser() user: User,
        @Query('page') page: number = 1,
        @Query('limit') limit: number = 10,
    ) {
        return this.supportService.getUserDisputes(user.id, page, limit);
    }

    @Get('disputes/:id')
    async getDisputeById(
        @Param('id') id: number,
        @CurrentUser() user: User,
    ) {
        const dispute = await this.supportService.getDisputeById(id);
        if (dispute.userId !== user.id && !user.roles?.some((r) => r.name === 'admin')) {
            throw new ForbiddenException('You do not have access to this dispute');
        }

        // Add computed field
        const closedStatuses = ['closed', 'resolved'];
        return {
            ...dispute,
            canSendMessage: !closedStatuses.includes(dispute.status),
        };
    }

    @Get('disputes/:id/messages')
    async getMessages(
        @Param('id') id: number,
        @CurrentUser() user: User,
    ) {
        return this.chatService.getMessages(id, user);
    }

    @Post('disputes/:id/messages')
    async sendMessage(
        @Param('id') id: number,
        @CurrentUser() user: User,
        @Body() dto: SendMessageDto,
    ) {
        // Force user role for messages from main app (not admin dashboard)
        return this.chatService.sendMessage(id, user, dto, true);
    }

    @Patch('disputes/:id/messages/read')
    async markAsRead(
        @Param('id') id: number,
        @CurrentUser() user: User,
    ) {
        const count = await this.chatService.markMessagesAsRead(id, user);
        return {
            message: 'Messages marked as read',
            count,
        };
    }

    @Get('disputes/:id/unread-count')
    async getUnreadCount(
        @Param('id') id: number,
        @CurrentUser() user: User,
    ) {
        const count = await this.chatService.getUnreadCount(id, user);
        return { count };
    }

    @Patch('disputes/:id/request-close')
    async requestCloseDispute(
        @Param('id') id: number,
        @CurrentUser() user: User,
        @Body() dto: RequestCloseDisputeDto,
    ) {
        const dispute = await this.supportService.requestCloseDispute(id, user.id, dto.reason);
        return {
            id: dispute.id,
            status: dispute.status,
            message: 'Close request sent to admin',
        };
    }
}
