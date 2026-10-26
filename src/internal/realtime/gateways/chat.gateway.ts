import {
  ConnectedSocket,
  MessageBody,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import {
  BadRequestException,
  Logger,
  UseFilters,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { Server } from 'socket.io';
import { SOCKET_EVENTS } from '../constants/socket-events.constant';
import { WsAuthGuard } from '../guards/ws-auth.guard';
import { CurrentWsAuth } from '../decorators/current-ws-auth.decorator';
import { RealtimeWsExceptionFilter } from '../filters/ws-exception.filter';
import { ClientRealtimeService } from '@/internal/actors/client/realtime/client-realtime.service';
import { ExpertRealtimeService } from '@/internal/actors/expert/realtime/expert-realtime.service';
import {
  SendChatMessageDto,
  TypingChatDto,
} from '../chat/dto/chat-events.dto';
import { ConsultationOrchestratorService } from '@/internal/consultation/orchestrator/consultation-orchestrator.service';
import type { AuthenticatedSocketIdentity } from '../types/socket-auth.types';
import type { RealtimeSocket } from '../types/socket-data.types';
import { REALTIME_GATEWAY_OPTIONS } from './gateway.options';

@UseFilters(RealtimeWsExceptionFilter)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
@WebSocketGateway(REALTIME_GATEWAY_OPTIONS)
export class ChatGateway implements OnGatewayInit {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly clientRealtimeService: ClientRealtimeService,
    private readonly expertRealtimeService: ExpertRealtimeService,
    private readonly orchestrator: ConsultationOrchestratorService,
  ) {}

  afterInit() {
    this.logger.log('[ChatGateway] Initialized on namespace /realtime');
  }

  private forActor(identity: AuthenticatedSocketIdentity) {
    return identity.actorType === 'client'
      ? this.clientRealtimeService
      : this.expertRealtimeService;
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage(SOCKET_EVENTS.CHAT.SEND)
  async handleChatSend(
    @ConnectedSocket() socket: RealtimeSocket,
    @MessageBody() dto: SendChatMessageDto,
    @CurrentWsAuth() identity: AuthenticatedSocketIdentity,
  ) {
    // Guard: only allow sending messages when consultation is active
    const status = await this.orchestrator.getStatus(dto.consultationId);
    if (!status || status.state !== 'active') {
      throw new BadRequestException('Consultation is not active');
    }

    return this.forActor(identity).sendChatMessage(
      this.server,
      socket,
      {
        consultationId: dto.consultationId,
        content: dto.content,
        attachmentMediaId: dto.attachmentMediaId,
        attachmentUrl: dto.attachmentUrl,
        attachmentType: dto.attachmentType,
      },
      identity,
    );
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage(SOCKET_EVENTS.CHAT.TYPING)
  handleChatTyping(
    @ConnectedSocket() socket: RealtimeSocket,
    @MessageBody() dto: TypingChatDto,
    @CurrentWsAuth() identity: AuthenticatedSocketIdentity,
  ) {
    this.forActor(identity).relayChatTyping(
      socket,
      dto.consultationId,
      dto.isTyping ?? true,
      identity,
    );
  }
}
