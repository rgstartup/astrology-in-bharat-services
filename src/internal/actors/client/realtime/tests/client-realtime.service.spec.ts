import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ClientRealtimeService } from '../client-realtime.service';
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

describe('ClientRealtimeService (delegates to domain handlers)', () => {
  let service: ClientRealtimeService;
  let presence: ReturnType<typeof handlerMock>;
  let notification: ReturnType<typeof handlerMock>;
  let chat: ReturnType<typeof handlerMock>;
  let db: any;
  let rooms: any;
  let budget: any;
  let orchestrator: any;
  let voice: any;

  const socket: any = { id: 's1', join: vi.fn(), leave: vi.fn() };
  const identity: any = { actorType: 'client', id: 10, clientId: 10 };

  beforeEach(() => {
    presence = handlerMock([
      'subscribeExpertPresence',
      'unsubscribeExpertPresence',
    ]);
    notification = handlerMock([
      'subscribeNotifications',
      'acknowledgeNotificationRead',
    ]);
    chat = handlerMock(['sendChatMessage', 'relayChatTyping']);
    db = {
      select: vi.fn(() => ({
        from: vi.fn(() => ({ where: vi.fn().mockResolvedValue([]) })),
      })),
    };
    rooms = {};
    budget = {};
    orchestrator = {};
    voice = {};
    service = new ClientRealtimeService(
      db,
      presence as any,
      notification as any,
      chat as any,
      rooms,
      budget,
      orchestrator,
      voice,
    );
  });

  it('routes presence calls to the presence handler', async () => {
    await service.subscribeExpertPresence(socket, 42);
    expect(presence.subscribeExpertPresence).toHaveBeenCalledWith(socket, 42);

    await service.unsubscribeExpertPresence(socket, 42);
    expect(presence.unsubscribeExpertPresence).toHaveBeenCalledWith(socket, 42);
  });

  it('routes notification calls to the notification handler', async () => {
    await service.subscribeNotifications(socket, identity);
    expect(notification.subscribeNotifications).toHaveBeenCalledWith(
      socket,
      identity,
    );

    await service.acknowledgeNotificationRead('n1', identity);
    expect(notification.acknowledgeNotificationRead).toHaveBeenCalledWith(
      'n1',
      identity,
    );
  });

  it('routes chat calls to the chat handler', async () => {
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
    await service.joinConsultation(server, socket, 100, 'voice', identity);
    expect(joinConsultationRoom).toHaveBeenCalledWith(
      { db, rooms, budget, orchestrator, voice },
      server,
      socket,
      100,
      'voice',
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

  it('joins the client room on connect without touching handlers', async () => {
    const server: any = {};
    await service.handleClientConnect(socket, identity, server);
    expect(socket.join).toHaveBeenCalledWith('client:10');
  });
});
