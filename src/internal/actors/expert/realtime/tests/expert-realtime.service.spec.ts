import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ExpertRealtimeService } from '../expert-realtime.service';
import {
  joinConsultationRoom,
  leaveConsultationRoom,
} from '@/internal/realtime/room/consultation-room-membership';

vi.mock('@/internal/realtime/room/consultation-room-membership', () => ({
  joinConsultationRoom: vi.fn(),
  leaveConsultationRoom: vi.fn(),
}));

function handlerMock(methods: string[]) {
  return Object.fromEntries(methods.map((m) => [m, vi.fn()]));
}

describe('ExpertRealtimeService (delegates to domain handlers)', () => {
  let service: ExpertRealtimeService;
  let presence: ReturnType<typeof handlerMock>;
  let notification: ReturnType<typeof handlerMock>;
  let chat: ReturnType<typeof handlerMock>;
  let db: any;
  let rooms: any;
  let budget: any;
  let markStarted: any;
  let orchestrator: any;
  let voice: any;

  const socket: any = { id: 's1', join: vi.fn(), leave: vi.fn() };
  const identity: any = { actorType: 'expert', id: 42, expertId: 42 };

  beforeEach(() => {
    presence = handlerMock([
      'registerConnection',
      'unregisterConnection',
      'handleHeartbeat',
      'subscribeExpertPresence',
      'unsubscribeExpertPresence',
    ]);
    notification = handlerMock([
      'subscribeNotifications',
      'acknowledgeNotificationRead',
    ]);
    chat = handlerMock([
      'sendChatMessage',
      'relayChatTyping',
      'acceptChat',
      'rejectChat',
      'endChat',
      'pauseChat',
      'resumeChat',
    ]);
    presence.registerConnection.mockResolvedValue(undefined);
    presence.unregisterConnection.mockResolvedValue(undefined);
    presence.handleHeartbeat.mockResolvedValue({ status: 'ok', timestamp: 1 });
    db = {
      select: vi.fn(() => ({
        from: vi.fn(() => ({ where: vi.fn().mockResolvedValue([]) })),
      })),
    };
    rooms = {};
    budget = {};
    markStarted = {};
    orchestrator = {};
    voice = {};
    service = new ExpertRealtimeService(
      db,
      presence as any,
      notification as any,
      chat as any,
      rooms,
      budget,
      markStarted,
      orchestrator,
      voice,
    );
  });

  it('joins the expert room and registers presence on connect', async () => {
    const server: any = {};
    await service.handleExpertConnect(socket, identity, server);
    expect(socket.join).toHaveBeenCalledWith('expert:42');
    expect(presence.registerConnection).toHaveBeenCalledWith(42, 's1');
  });

  it('unregisters presence on disconnect', async () => {
    const server: any = {
      to: vi.fn(() => ({ emit: vi.fn() })),
    };
    await service.handleExpertDisconnect(socket, identity, server);
    expect(presence.unregisterConnection).toHaveBeenCalledWith(42, 's1');
  });

  it('routes heartbeat and presence calls to the presence handler', async () => {
    await service.handleHeartbeat(socket, identity);
    expect(presence.handleHeartbeat).toHaveBeenCalledWith(42, 's1');

    await service.subscribeExpertPresence(socket, 42);
    expect(presence.subscribeExpertPresence).toHaveBeenCalledWith(socket, 42);

    await service.unsubscribeExpertPresence(socket, 42);
    expect(presence.unsubscribeExpertPresence).toHaveBeenCalledWith(socket, 42);
  });

  it('routes notification/chat calls to their handlers', async () => {
    await service.subscribeNotifications(socket, identity);
    expect(notification.subscribeNotifications).toHaveBeenCalledWith(
      socket,
      identity,
    );

    const server: any = {};
    const input = { consultationId: 100, content: 'Hi' };
    await service.sendChatMessage(server, socket, input, identity);
    expect(chat.sendChatMessage).toHaveBeenCalledWith(
      server,
      socket,
      input,
      identity,
    );

    service.relayChatTyping(socket, 100, true, identity);
    expect(chat.relayChatTyping).toHaveBeenCalledWith(
      socket,
      100,
      true,
      identity,
    );
  });

  it('joins/leaves through the shared room membership', async () => {
    const server: any = {};
    await service.joinConsultation(server, socket, 100, 'chat', identity);
    expect(joinConsultationRoom).toHaveBeenCalledWith(
      { db, rooms, budget, orchestrator, markStarted, voice },
      server,
      socket,
      100,
      'chat',
      identity,
    );

    await service.leaveConsultation(socket, 100, identity);
    expect(leaveConsultationRoom).toHaveBeenCalledWith(
      socket,
      100,
      identity,
      rooms,
    );
  });

  it('routes media readiness to the orchestrator', async () => {
    const server: any = {};
    orchestrator.mediaReady = vi.fn(async () => ({ bothReady: false }));
    await service.mediaReady(server, 100, identity);
    expect(orchestrator.mediaReady).toHaveBeenCalledWith(
      server,
      100,
      identity,
    );
  });
});
