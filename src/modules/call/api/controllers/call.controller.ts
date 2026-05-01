import { Controller, Post, Get, Patch, Body, UseGuards, Header, Param, ParseIntPipe, NotFoundException } from '@nestjs/common';
import { JwtAuthGuard } from '@/modules/auth/api/guards/auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { AuthenticatedUser } from '@/common/types/authenticated-user.type';
import { UserRepository } from '@/modules/users/infrastructure/persistence/repositories/user.repository';
import { CallType } from '../../infrastructure/persistence/entities/call-session.entity';
import { CallFacade } from '../../application/call.facade';
import { CallSessionFilter } from '../../application/use-cases/get-expert-sessions.use-case';
import { CallGateway } from '../../call.gateway';

@Controller({
    path: 'call',
    version: '1',
})
@UseGuards(JwtAuthGuard)
export class CallController {
    constructor(
        private readonly callFacade: CallFacade,
        private readonly callGateway: CallGateway,
        private readonly userRepository: UserRepository,
    ) { }

    private async resolveUserId(betterAuthId: string): Promise<number> {
        const localUser = await this.userRepository.findByBetterAuthId(betterAuthId);
        if (!localUser) throw new NotFoundException('User not found');
        return localUser.id;
    }

    @Post('initiate')
    async initiate(
        @CurrentUser() user: AuthenticatedUser,
        @Body() body: { expertId: number; type?: CallType }
    ) {
        const userId = await this.resolveUserId(user.id);
        console.log(`[CallController] Initiate call: userId=${userId}, expertId=${body.expertId}, type=${body.type || CallType.AUDIO}`);
        return this.callFacade.initiate(
            userId,
            body.expertId,
            body.type || CallType.AUDIO
        );
    }

    @Post('accept')
    async accept(
        @CurrentUser() user: AuthenticatedUser,
        @Body() body: { sessionId: number }
    ) {
        const userId = await this.resolveUserId(user.id);
        console.log(`[CallController] Accept call: userId=${userId}, sessionId=${body.sessionId}`);
        return this.callFacade.accept(
            userId,
            body.sessionId
        );
    }

    @Post('end')
    async end(
        @Body() body: { sessionId: number }
    ) {
        console.log(`[CallController] End call: sessionId=${body.sessionId}`);
        return this.callFacade.end(body.sessionId);
    }

    @Patch('session/:sessionId/status')
    async updateStatus(
        @CurrentUser() user: AuthenticatedUser,
        @Param('sessionId', ParseIntPipe) sessionId: number,
        @Body('status') status: string,
    ) {
        console.log(`[CallController] Expert Updating status of call session ${sessionId} to ${status}`);

        if (status === 'accepted') {
            const userId = await this.resolveUserId(user.id);
            const res = await this.callFacade.accept(userId, sessionId);
            return res;
        }

        if (status === 'rejected' || status === 'cancelled') {
            const res = await this.callFacade.end(sessionId);
            return res;
        }

        return { success: false, message: 'Invalid status update for call' };
    }

    @Get('session/:sessionId')
    @Header('Cache-Control', 'no-store')
    async getSession(@Param('sessionId', ParseIntPipe) sessionId: number) {
        return this.callFacade.getSession(sessionId);
    }

    @Get('token/:sessionId')
    @Header('Cache-Control', 'no-store')
    async getToken(
        @CurrentUser() user: AuthenticatedUser,
        @Param('sessionId', ParseIntPipe) sessionId: number
    ) {
        const userId = await this.resolveUserId(user.id);
        return this.callFacade.getCallToken(userId, sessionId);
    }

    @Get('sessions/appointments/pending')
    @Header('Cache-Control', 'no-store')
    async getPendingAppointments(@CurrentUser() user: AuthenticatedUser) {
        const userId = await this.resolveUserId(user.id);
        return this.callFacade.getExpertSessions(userId, CallSessionFilter.RECENT_PENDING);
    }

    @Get('sessions/appointments/completed')
    @Header('Cache-Control', 'no-store')
    async getCompletedAppointments(@CurrentUser() user: AuthenticatedUser) {
        const userId = await this.resolveUserId(user.id);
        return this.callFacade.getExpertSessions(userId, CallSessionFilter.RECENT_COMPLETED);
    }
}
