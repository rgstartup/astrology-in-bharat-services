import { Controller, Get, Patch, Param, Body, Query, UseGuards, Post } from '@nestjs/common';
import { SupportService } from '../../application/services/support.service';
import { DisputeChatService } from '../../application/services/dispute-chat.service';
import { UpdateDisputeStatusDto } from '../../application/dtos/update-dispute-status.dto';
import { SendMessageDto } from '../../application/dtos/send-message.dto';
import { JwtAuthGuard } from '@/modules/auth/interfaces/guards/auth.guard';
import { RolesGuard } from '@/modules/auth/interfaces/guards/role.guard';
import { Roles } from '@/common/interfaces/decorators/roles.decorator';
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
        @Query('status') status?: string,
        @Query('type') type?: string,
        @Query('priority') priority?: string,
        @Query('page') page: number = 1,
        @Query('limit') limit: number = 10,
    ) {
        const filters = { status, type, priority };
        return this.supportService.getAllDisputes(filters, page, limit);
    }

    @Get('disputes/stats')
    async getDisputeStats() {
        return this.supportService.getDisputeStats();
    }

    @Get('disputes/:id')
    async getDisputeById(@Param('id') id: number) {
        return this.supportService.getDisputeById(id);
    }

    @Patch('disputes/:id/status')
    async updateDisputeStatus(
        @Param('id') id: number,
        @Body() dto: UpdateDisputeStatusDto,
    ) {
        const dispute = await this.supportService.updateDisputeStatus(id, dto);
        return {
            message: 'Dispute status updated successfully',
            dispute,
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
        // Admin messages: forceUserRole=false (default) to use ADMIN senderType
        return this.chatService.sendMessage(id, user, dto, false);
    }
}
