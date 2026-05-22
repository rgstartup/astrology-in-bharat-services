import { Controller, Get, Post, Patch, Body, Param, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { SupportFacade } from '../../application/support.facade';
import { CreateDisputeDto } from '../dto/create-dispute.dto';
import { SendDisputeMessageDto } from '../dto/send-dispute-message.dto';
import { JwtAuthGuard } from '@/modules/auth/api/guards/auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { User } from '@/modules/users/infrastructure/entities/user.entity';

@Controller({
    path: 'support',
    version: '1',
})
@UseGuards(JwtAuthGuard)
export class SupportController {
    constructor(private readonly supportFacade: SupportFacade) { }

    @Get('disputes')
    async getDisputes(@CurrentUser() user: User) {
        return this.supportFacade.getDisputes(user.id);
    }

    @Get('disputes/:id')
    async getDisputeById(
        @CurrentUser() user: User,
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        return this.supportFacade.getDisputeById(user.id, id);
    }

    @Post('disputes')
    async createDispute(
        @CurrentUser() user: User,
        @Body() dto: CreateDisputeDto,
    ) {
        return this.supportFacade.createDispute(user.id, dto);
    }

    @Get('disputes/:id/messages')
    async getMessages(
        @CurrentUser() user: User,
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        return this.supportFacade.getMessages(user.id, id);
    }

    @Post('disputes/:id/messages')
    async sendMessage(
        @CurrentUser() user: User,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: SendDisputeMessageDto,
    ) {
        return this.supportFacade.sendMessage(user.id, id, dto);
    }

    @Patch('disputes/:id/messages/read')
    async markMessagesAsRead(
        @CurrentUser() user: User,
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        return this.supportFacade.markMessagesAsRead(user.id, id);
    }
}
