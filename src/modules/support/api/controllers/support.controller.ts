import { Controller, Get, Post, Patch, Body, Param, UseGuards, ParseIntPipe, NotFoundException } from '@nestjs/common';
import { SupportFacade } from '../../application/support.facade';
import { CreateDisputeDto } from '../dto/create-dispute.dto';
import { SendDisputeMessageDto } from '../dto/send-dispute-message.dto';
import { JwtAuthGuard } from '@/modules/auth/api/guards/auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { AuthenticatedUser } from '@/common/types/authenticated-user.type';
import { UserRepository } from '@/modules/users/infrastructure/persistence/repositories/user.repository';

@Controller({
    path: 'support',
    version: '1',
})
@UseGuards(JwtAuthGuard)
export class SupportController {
    constructor(
        private readonly supportFacade: SupportFacade,
        private readonly userRepository: UserRepository,
    ) {}

    private async resolveUserId(betterAuthId: string): Promise<number> {
        const localUser = await this.userRepository.findByBetterAuthId(betterAuthId);
        if (!localUser) throw new NotFoundException('User not found');
        return localUser.id;
    }

    @Get('disputes')
    async getDisputes(@CurrentUser() user: AuthenticatedUser) {
        const userId = await this.resolveUserId(user.id);
        return this.supportFacade.getDisputes(userId);
    }

    @Get('disputes/:id')
    async getDisputeById(
        @CurrentUser() user: AuthenticatedUser,
        @Param('id', ParseIntPipe) id: number,
    ) {
        const userId = await this.resolveUserId(user.id);
        return this.supportFacade.getDisputeById(userId, id);
    }

    @Post('disputes')
    async createDispute(
        @CurrentUser() user: AuthenticatedUser,
        @Body() dto: CreateDisputeDto,
    ) {
        const userId = await this.resolveUserId(user.id);
        return this.supportFacade.createDispute(userId, dto);
    }

    @Get('disputes/:id/messages')
    async getMessages(
        @CurrentUser() user: AuthenticatedUser,
        @Param('id', ParseIntPipe) id: number,
    ) {
        const userId = await this.resolveUserId(user.id);
        return this.supportFacade.getMessages(userId, id);
    }

    @Post('disputes/:id/messages')
    async sendMessage(
        @CurrentUser() user: AuthenticatedUser,
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: SendDisputeMessageDto,
    ) {
        const userId = await this.resolveUserId(user.id);
        return this.supportFacade.sendMessage(userId, id, dto);
    }

    @Patch('disputes/:id/messages/read')
    async markMessagesAsRead(
        @CurrentUser() user: AuthenticatedUser,
        @Param('id', ParseIntPipe) id: number,
    ) {
        const userId = await this.resolveUserId(user.id);
        return this.supportFacade.markMessagesAsRead(userId, id);
    }
}
