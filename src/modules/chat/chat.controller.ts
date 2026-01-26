import { Controller, Post, Get, Body, Param, UseGuards, ParseIntPipe, Header } from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '@/modules/auth/guards/auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { User } from '@/modules/users/entities/user.entity';

import { ChatGateway } from './chat.gateway';

@Controller({
    path: 'chat',
    version: '1',
})
@UseGuards(JwtAuthGuard)
export class ChatController {
    constructor(
        private readonly chatService: ChatService,
        private readonly chatGateway: ChatGateway
    ) { }

    @Post('initiate')
    async initiateChat(
        @CurrentUser() user: User,
        @Body('expertId', ParseIntPipe) expertId: number,
    ) {
        const session = await this.chatService.initiateChat(user.id, expertId);

        this.chatGateway.notifyExpertNewRequest(expertId, session);

        setTimeout(async () => {
            const expiredSession = await this.chatService.expireSession(session.id);
            if (expiredSession) {
                // If it was actually expired (was still pending), notify users
                this.chatGateway.server.to(`room_${session.id}`).emit('session_ended', {
                    status: 'expired',
                    id: session.id,
                    message: 'Session expired as expert did not join within 15 minutes.'
                });
                // Also notify expert's dashboard room
                this.chatGateway.notifyExpertStatusUpdate(session.expertId, 'session_ended', {
                    status: 'expired',
                    id: session.id
                });
            }
        }, 900000); // 15 minutes

        return session;
    }

    @Post('activate/:sessionId')
    async activateSession(@Param('sessionId', ParseIntPipe) sessionId: number) {
        const session = await this.chatService.activateSession(sessionId);
        if (session) {
            // Notify the specific chat room
            this.chatGateway.server.to(`room_${sessionId}`).emit('session_activated', session);
            // Notify the expert's dashboard room
            this.chatGateway.notifyExpertStatusUpdate(session.expertId, 'session_activated', session);
        }
        return session;
    }

    @Post('end/:sessionId')
    async endChat(@Param('sessionId', ParseIntPipe) sessionId: number) {
        const session = await this.chatService.endChat(sessionId);
        if (session) {
            // Notify the specific chat room
            this.chatGateway.server.to(`room_${sessionId}`).emit('session_ended', session);
            // Notify the expert's dashboard room
            this.chatGateway.notifyExpertStatusUpdate(session.expertId, 'session_ended', session);
        }
        return session;
    }

    @Get('session/:sessionId')
    @Header('Cache-Control', 'no-store')
    async getSession(@Param('sessionId', ParseIntPipe) sessionId: number) {
        return this.chatService.getSession(sessionId);
    }

    @Get('history/:sessionId')
    getHistory(@Param('sessionId', ParseIntPipe) sessionId: number) {
        return this.chatService.getMessages(sessionId);
    }

    @Get('sessions/pending')
    @Header('Cache-Control', 'no-store')
    getPendingSessions(@CurrentUser() user: User) {
        return this.chatService.getPendingSessionsByExpertUser(user.id);
    }

    @Get('sessions/completed')
    @Header('Cache-Control', 'no-store')
    getCompletedSessions(@CurrentUser() user: User) {
        return this.chatService.getCompletedSessionsByExpertUser(user.id);
    }
}
