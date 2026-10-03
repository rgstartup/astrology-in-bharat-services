export { RealtimeModule } from './realtime.module';
export { RealtimeGateway } from './realtime.gateway';
export {
  RealtimeChatGateway,
  RealtimeCallGateway,
  RealtimeNotificationGateway,
  RealtimePresenceGateway,
  REALTIME_NAMESPACE,
  REALTIME_GATEWAY_OPTIONS,
} from './gateways';

export {
  SOCKET_EVENTS,
  SOCKET_ROOMS,
  REDIS_KEYS,
  REDIS_CHANNELS,
} from './constants';
export type { SocketEventGroup } from './constants';

export { WsAuthGuard, WsAuthorizationGuard } from './guards';
export { WS_ROLES_KEY, WsRoles, CurrentWsAuth } from './decorators';
export { RealtimeWsExceptionFilter } from './filters';
export type { WsErrorResponse } from './filters';

export { RealtimeAuthService } from './services';

export { REALTIME_AUTH_VERIFIERS } from './contracts';
export type { IRealtimeAuthVerifier } from './contracts';

export type {
  RealtimeActorType,
  BaseSocketIdentity,
  ClientSocketIdentity,
  ExpertSocketIdentity,
  AuthenticatedSocketIdentity,
  RealtimeSocketData,
  RealtimeSocket,
} from './types';

export {
  SubscribePresenceDto,
  JoinChatDto,
  LeaveChatDto,
  SendChatMessageDto,
  TypingChatDto,
  JoinCallDto,
  CallOfferDto,
  CallAnswerDto,
  IceCandidateDto,
  CallActionDto,
  ReadNotificationDto,
  SubscribeNotificationDto,
} from './dto';
