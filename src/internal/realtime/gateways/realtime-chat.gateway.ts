import {
  ConnectedSocket,
  MessageBody,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import {
  Logger,
  UseFilters,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { Server } from 'socket.io';
import { SOCKET_EVENTS } from '../constants/socket-events.constant';
import { CHAT_ACK_STATUS } from '../constants/chat-ack-status.constant';
import { WsAuthGuard } from '../guards/ws-auth.guard';
import { CurrentWsAuth } from '../decorators/current-ws-auth.decorator';
import { RealtimeWsExceptionFilter } from '../filters/ws-exception.filter';
import { ClientRealtimeService } from '@/internal/actors/client/realtime/client-realtime.service';
import { ExpertRealtimeService } from '@/internal/actors/expert/realtime/expert-realtime.service';
import {
  JoinChatDto,
  LeaveChatDto,
  SendChatMessageDto,
  TypingChatDto,
  ChatRequestDto,
  ChatActionDto,
} from '../dto/chat-events.dto';
import type { AuthenticatedSocketIdentity } from '../types/socket-auth.types';
import type { RealtimeSocket } from '../types/socket-data.types';
import { REALTIME_GATEWAY_OPTIONS } from './realtime-gateway.options';

@UseFilters(RealtimeWsExceptionFilter)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
@WebSocketGateway(REALTIME_GATEWAY_OPTIONS)
export class RealtimeChatGateway implements OnGatewayInit {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(RealtimeChatGateway.name);

  constructor(
    private readonly clientRealtimeService: ClientRealtimeService,
    private readonly expertRealtimeService: ExpertRealtimeService,
  ) {}

  afterInit() {
    this.logger.log('[RealtimeChatGateway] Initialized on namespace /realtime');
  }

  private forActor(identity: AuthenticatedSocketIdentity) {
    return identity.actorType === 'client'
      ? this.clientRealtimeService
      : this.expertRealtimeService;
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage(SOCKET_EVENTS.CHAT.JOIN)
  async handleChatJoin(
    @ConnectedSocket() socket: RealtimeSocket,
    @MessageBody() dto: JoinChatDto,
    @CurrentWsAuth() identity: AuthenticatedSocketIdentity,
  ) {
    return this.forActor(identity).joinChat(
      socket,
      dto.consultationId,
      identity,
    );
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage(SOCKET_EVENTS.CHAT.LEAVE)
  async handleChatLeave(
    @ConnectedSocket() socket: RealtimeSocket,
    @MessageBody() dto: LeaveChatDto,
    @CurrentWsAuth() identity: AuthenticatedSocketIdentity,
  ) {
    return this.forActor(identity).leaveChat(
      socket,
      dto.consultationId,
      identity,
    );
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage(SOCKET_EVENTS.CHAT.SEND)
  async handleChatSend(
    @ConnectedSocket() socket: RealtimeSocket,
    @MessageBody() dto: SendChatMessageDto,
    @CurrentWsAuth() identity: AuthenticatedSocketIdentity,
  ) {
    return this.forActor(identity).sendChatMessage(
      socket,
      {
        consultationId: dto.consultationId,
        content: dto.content,
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

  @UseGuards(WsAuthGuard)
  @SubscribeMessage(SOCKET_EVENTS.CHAT.REQUEST)
  async handleChatRequest(
    @ConnectedSocket() socket: RealtimeSocket,
    @MessageBody() dto: ChatRequestDto,
    @CurrentWsAuth() identity: AuthenticatedSocketIdentity,
  ) {
    if (identity.actorType !== 'client') return { status: CHAT_ACK_STATUS.IGNORED };
    return this.clientRealtimeService.requestChat(
      this.server,
      socket,
      dto.consultationId,
      dto.expertId,
      identity,
    );
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage(SOCKET_EVENTS.CHAT.ACCEPT)
  async handleChatAccept(
    @ConnectedSocket() socket: RealtimeSocket,
    @MessageBody() dto: ChatActionDto,
    @CurrentWsAuth() identity: AuthenticatedSocketIdentity,
  ) {
    if (identity.actorType !== 'expert') return { status: CHAT_ACK_STATUS.IGNORED };
    return this.expertRealtimeService.acceptChat(
      this.server,
      socket,
      dto.consultationId,
      identity,
    );
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage(SOCKET_EVENTS.CHAT.REJECT)
  async handleChatReject(
    @ConnectedSocket() socket: RealtimeSocket,
    @MessageBody() dto: ChatActionDto,
    @CurrentWsAuth() identity: AuthenticatedSocketIdentity,
  ) {
    if (identity.actorType !== 'expert') return { status: CHAT_ACK_STATUS.IGNORED };
    return this.expertRealtimeService.rejectChat(
      this.server,
      socket,
      dto.consultationId,
      identity,
    );
  }
}
