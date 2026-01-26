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

        const expiryTime = parseInt(process.env.CHAT_REQUEST_EXPIRY_MS || '120000', 10);
        const expiryMinutes = Math.ceil(expiryTime / 60000);

        const expiresAt = new Date(Date.now() + expiryTime);

        // Calculate affordable minutes for paid chat or use freeMinutes
        let maxMinutes = session.isFree ? session.freeMinutes : 0;
        if (!session.isFree && session.pricePerMinute > 0) {
            const balance = await this.chatGateway.getWalletBalance(user.id);
            maxMinutes = Math.floor(balance / session.pricePerMinute);
        }

        const sessionWithExpiry = { ...session, expiresAt, maxMinutes };

        // Notify expert with the full session object (including expiresAt and maxMinutes)
        this.chatGateway.notifyExpertNewRequest(expertId, sessionWithExpiry);

        setTimeout(async () => {
            const expiredSession = await this.chatService.expireSession(session.id);
            if (expiredSession) {
                // If it was actually expired (was still pending), notify users
                this.chatGateway.server.to(`room_${session.id}`).emit('session_ended', {
                    status: 'expired',
                    id: session.id,
                    message: `Session expired as expert did not join within ${expiryMinutes} minutes.`
                });
                // Also notify expert's dashboard room
                this.chatGateway.notifyExpertStatusUpdate(session.expertId, 'session_ended', {
                    status: 'expired',
                    id: session.id
                });
            }
        }, expiryTime);

        return sessionWithExpiry;
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
        const session = await this.chatService.getSession(sessionId);
        if (session && session.status === 'pending') {
            const expiryTime = parseInt(process.env.CHAT_REQUEST_EXPIRY_MS || '120000', 10);
            const userBalance = await this.chatGateway.getWalletBalance(session.userId);
            const maxMinutes = session.isFree ? session.freeMinutes :
                (session.pricePerMinute > 0 ? Math.floor(userBalance / session.pricePerMinute) : 0);

            return {
                ...session,
                expiresAt: new Date(new Date(session.createdAt).getTime() + expiryTime),
                maxMinutes
            };
        }
        return session;
    }

    @Get('history/:sessionId')
    getHistory(@Param('sessionId', ParseIntPipe) sessionId: number) {
        return this.chatService.getMessages(sessionId);
    }

    @Get('sessions/pending')
    @Header('Cache-Control', 'no-store')
    async getPendingSessions(@CurrentUser() user: User) {
        const sessions = await this.chatService.getPendingSessionsByExpertUser(user.id);
        const expiryTime = parseInt(process.env.CHAT_REQUEST_EXPIRY_MS || '120000', 10);

        return Promise.all(sessions.map(async (session) => {
            const userBalance = session.status === 'pending' ? await this.chatGateway.getWalletBalance(session.userId) : 0;
            const maxMinutes = session.isFree ? session.freeMinutes :
                (session.pricePerMinute > 0 ? Math.floor(userBalance / session.pricePerMinute) : 5); // Default 5 for paid if we don't have balance context

            return {
                ...session,
                expiresAt: session.status === 'pending' ? new Date(new Date(session.createdAt).getTime() + expiryTime) : null,
                maxMinutes
            };
        }));
    }

    @Get('sessions/completed')
    @Header('Cache-Control', 'no-store')
    getCompletedSessions(@CurrentUser() user: User) {
        return this.chatService.getCompletedSessionsByExpertUser(user.id);
    }

    @Get('sessions/all')
    @Header('Cache-Control', 'no-store')
    async getAllSessions(@CurrentUser() user: User) {
        const sessions = await this.chatService.getAllSessionsByExpertUser(user.id);
        const expiryTime = parseInt(process.env.CHAT_REQUEST_EXPIRY_MS || '120000', 10);

        return Promise.all(sessions.map(async (session) => {
            const userBalance = session.status === 'pending' ? await this.chatGateway.getWalletBalance(session.userId) : 0;
            const maxMinutes = session.isFree ? session.freeMinutes :
                (session.pricePerMinute > 0 ? Math.floor(userBalance / session.pricePerMinute) : 5);

            return {
                ...session,
                expiresAt: session.status === 'pending' ? new Date(new Date(session.createdAt).getTime() + expiryTime) : null,
                maxMinutes
            };
        }));
    }

    @Get('sessions/my-sessions')
    @Header('Cache-Control', 'no-store')
    async getMySessionsAsClient(@CurrentUser() user: User) {
        const sessions = await this.chatService.getAllSessionsByClient(user.id);
        const expiryTime = parseInt(process.env.CHAT_REQUEST_EXPIRY_MS || '120000', 10);

        return Promise.all(sessions.map(async (session) => {
            const userBalance = await this.chatGateway.getWalletBalance(user.id);
            const maxMinutes = session.isFree ? session.freeMinutes :
                (session.pricePerMinute > 0 ? Math.floor(userBalance / session.pricePerMinute) : 0);

            return {
                ...session,
                expiresAt: session.status === 'pending' ? new Date(new Date(session.createdAt).getTime() + expiryTime) : null,
                maxMinutes
            };
        }));
    }

    @Get('sessions/active-client')
    @Header('Cache-Control', 'no-store')
    async getActiveClientSession(@CurrentUser() user: User) {
        const session = await this.chatService.getActiveClientSession(user.id);
        if (session) {
            const expiryTime = parseInt(process.env.CHAT_REQUEST_EXPIRY_MS || '120000', 10);
            const userBalance = await this.chatGateway.getWalletBalance(session.userId);
            const maxMinutes = session.isFree ? session.freeMinutes :
                (session.pricePerMinute > 0 ? Math.floor(userBalance / session.pricePerMinute) : 0);

            return {
                ...session,
                expiresAt: session.status === 'pending' ? new Date(new Date(session.createdAt).getTime() + expiryTime) : null,
                maxMinutes
            };
        }
        return null;
    }
}
