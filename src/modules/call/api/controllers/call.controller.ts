import { Controller, Post, Get, Patch, Body, UseGuards, Req, Header, Param, ParseIntPipe, Query } from '@nestjs/common';
import { JwtAuthGuard } from '@/modules/auth/api/guards/auth.guard';
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
    ) { }

    @Post('initiate')
    // ... (lines 14-24 remains same)
    async initiate(
        @Req() req: any,
        @Body() body: { expertId: number; type?: CallType }
    ) {
        console.log(`[CallController] Initiate call: userId=${req.user.id}, expertId=${body.expertId}, type=${body.type || CallType.AUDIO}`);
        return this.callFacade.initiate(
            req.user.id,
            body.expertId,
            body.type || CallType.AUDIO
        );
    }

    @Post('accept')
    async accept(
        @Req() req: any,
        @Body() body: { sessionId: number }
    ) {
        console.log(`[CallController] Accept call: userId=${req.user.id}, sessionId=${body.sessionId}`);
        return this.callFacade.accept(
            req.user.id,
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
        @Req() req: any,
        @Param('sessionId', ParseIntPipe) sessionId: number,
        @Body('status') status: string,
    ) {
        console.log(`[CallController] Expert Updating status of call session ${sessionId} to ${status}`);
        
        if (status === 'accepted') {
            const res = await this.callFacade.accept(req.user.id, sessionId);
            // Notifications are handled inside fachada/uses cases for calls usually,
            // but we'll ensure consistency if needed via gateway.
            return res;
        }

        if (status === 'rejected' || status === 'cancelled') {
            const res = await this.callFacade.end(sessionId); // Calling end for rejection too
            // Note: specialized end logic might be needed for 'pending' state
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
        @Req() req: any,
        @Param('sessionId', ParseIntPipe) sessionId: number
    ) {
        return this.callFacade.getCallToken(req.user.id, sessionId);
    }

    @Get('sessions/appointments/pending')
    @Header('Cache-Control', 'no-store')
    async getPendingAppointments(@Req() req: any) {
        return this.callFacade.getExpertSessions(req.user.id, CallSessionFilter.RECENT_PENDING);
    }

    @Get('sessions/appointments/completed')
    @Header('Cache-Control', 'no-store')
    async getCompletedAppointments(@Req() req: any) {
        return this.callFacade.getExpertSessions(req.user.id, CallSessionFilter.RECENT_COMPLETED);
    }

    @Get('sessions/all')
    @Header('Cache-Control', 'no-store')
    async getAllSessions(
        @Req() req: any,
        @Query('limit') limit?: string,
        @Query('offset') offset?: string,
        @Query('search') search?: string,
    ) {
        return this.callFacade.getExpertSessions(req.user.id, CallSessionFilter.ALL, {
            limit: limit ? parseInt(limit) : undefined,
            offset: offset ? parseInt(offset) : undefined,
            search,
        });
    }
}
