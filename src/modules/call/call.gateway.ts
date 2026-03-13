import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    OnGatewayConnection,
    OnGatewayDisconnect,
    MessageBody,
    ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Inject, Logger, forwardRef } from '@nestjs/common';
import { CallFacade } from './application/call.facade';

@WebSocketGateway({
    cors: {
        origin: '*',
    },
    namespace: 'call',
})
export class CallGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private logger: Logger = new Logger('CallGateway');
    private expertSockets = new Map<number, string>(); // expertId -> socketId

    constructor(
        @Inject(forwardRef(() => CallFacade))
        private readonly callFacade: CallFacade,
    ) { }

    handleConnection(client: Socket) {
        this.logger.log(`Client connected to call: ${client.id}`);
    }

    handleDisconnect(client: Socket) {
        this.logger.log(`Client disconnected from call: ${client.id}`);
        for (const [expertId, socketId] of this.expertSockets.entries()) {
            if (socketId === client.id) {
                this.expertSockets.delete(expertId);
                this.logger.log(`Expert ${expertId} unregistered from call due to disconnect`);
                break;
            }
        }
    }

    @SubscribeMessage('register_expert')
    handleRegisterExpert(
        @ConnectedSocket() client: Socket,
        @MessageBody() payload: { expertId: number },
    ) {
        this.expertSockets.set(payload.expertId, client.id);
        client.join(`expert_${payload.expertId}`);
        this.logger.log(`Expert ${payload.expertId} registered for calls. Socket ID: ${client.id}`);
        return { status: 'registered' };
    }

    notifyExpertNewCall(expertId: number, callData: any) {
        // @ts-ignore - access internal adapter rooms
        const rooms = this.server.sockets?.adapter?.rooms;
        const expertRoom = rooms?.get(`expert_${expertId}`);
        const socketCount = expertRoom ? expertRoom.size : 0;

        this.logger.log(`Attempting to notify expert room expert_${expertId}. Active sockets in room: ${socketCount}`);

        this.server.to(`expert_${expertId}`).emit('new_call_request', callData);
        this.logger.log(`Notified expert room expert_${expertId} of new call ${callData.session.id}`);
    }

    @SubscribeMessage('join_call_room')
    handleJoinRoom(
        @ConnectedSocket() client: Socket,
        @MessageBody() payload: { sessionId: number },
    ) {
        client.join(`call_room_${payload.sessionId}`);
        this.logger.log(`Client ${client.id} joined call_room_${payload.sessionId}`);
        return { status: 'joined' };
    }

    @SubscribeMessage('end_call')
    async handleEndCall(
        @ConnectedSocket() client: Socket,
        @MessageBody() payload: { sessionId: number },
    ) {
        this.logger.log(`end_call received for sessionId=${payload.sessionId} from ${client.id}`);
        try {
            await this.callFacade.end(payload.sessionId);
            return { status: 'ended' };
        } catch (error) {
            this.logger.error(`Failed to end call sessionId=${payload.sessionId}`, error);
            return { status: 'error', message: error.message };
        }
    }
}
