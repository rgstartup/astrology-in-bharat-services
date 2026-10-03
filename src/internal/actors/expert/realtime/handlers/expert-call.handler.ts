import { Injectable, Logger } from '@nestjs/common';
import type { Server } from 'socket.io';
import { SOCKET_EVENTS } from '@/internal/realtime/constants/socket-events.constant';
import { SOCKET_ROOMS } from '@/internal/realtime/constants/socket-rooms.constant';
import type { AuthenticatedSocketIdentity } from '@/internal/realtime/types/socket-auth.types';
import type { RealtimeSocket } from '@/internal/realtime/types/socket-data.types';

interface CallSignalInput {
  consultationId: number;
  offer?: Record<string, any>;
  answer?: Record<string, any>;
  candidate?: Record<string, any>;
}

interface CallEndInput {
  consultationId: number;
  reason?: string;
}

@Injectable()
export class ExpertCallHandler {
  private readonly logger = new Logger(ExpertCallHandler.name);

  async joinCall(
    socket: RealtimeSocket,
    consultationId: number,
    identity: AuthenticatedSocketIdentity,
  ): Promise<{ status: string; consultationId: number }> {
    const room = SOCKET_ROOMS.CALL_SESSION(consultationId);
    await socket.join(room);
    this.logger.debug(
      `Actor ${identity.actorType}:${identity.id} joined call room ${room} (socket: ${socket.id})`,
    );
    return { status: 'joined', consultationId };
  }

  async leaveCall(
    socket: RealtimeSocket,
    consultationId: number,
    identity: AuthenticatedSocketIdentity,
  ): Promise<{ status: string; consultationId: number }> {
    const room = SOCKET_ROOMS.CALL_SESSION(consultationId);
    await socket.leave(room);
    this.logger.debug(
      `Actor ${identity.actorType}:${identity.id} left call room ${room} (socket: ${socket.id})`,
    );
    return { status: 'left', consultationId };
  }

  relayCallSignal(
    socket: RealtimeSocket,
    event: string,
    input: CallSignalInput,
    identity: AuthenticatedSocketIdentity,
  ): void {
    const room = SOCKET_ROOMS.CALL_SESSION(input.consultationId);
    socket.to(room).emit(event, {
      consultationId: input.consultationId,
      senderId: identity.id,
      senderType: identity.actorType,
      offer: input.offer,
      answer: input.answer,
      candidate: input.candidate,
    });
  }

  async endCall(
    server: Server,
    socket: RealtimeSocket,
    input: CallEndInput,
    identity: AuthenticatedSocketIdentity,
  ): Promise<{ status: string; consultationId: number }> {
    const room = SOCKET_ROOMS.CALL_SESSION(input.consultationId);
    server.to(room).emit(SOCKET_EVENTS.CALL.END, {
      consultationId: input.consultationId,
      endedBy: identity.id,
      endedByActor: identity.actorType,
      reason: input.reason,
    });
    return this.leaveCall(socket, input.consultationId, identity);
  }
}
