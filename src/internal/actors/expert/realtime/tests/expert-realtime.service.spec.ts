import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ExpertRealtimeService } from '../expert-realtime.service';

function handlerMock(methods: string[]) {
  return Object.fromEntries(methods.map((m) => [m, vi.fn()]));
}

describe('ExpertRealtimeService (delegates to domain handlers)', () => {
  let service: ExpertRealtimeService;
  let presence: ReturnType<typeof handlerMock>;
  let notification: ReturnType<typeof handlerMock>;
  let chat: ReturnType<typeof handlerMock>;
  let call: ReturnType<typeof handlerMock>;

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
      'joinChat',
      'leaveChat',
      'sendChatMessage',
      'relayChatTyping',
    ]);
    call = handlerMock([
      'joinCall',
      'leaveCall',
      'relayCallSignal',
      'endCall',
    ]);
    presence.registerConnection.mockResolvedValue(undefined);
    presence.unregisterConnection.mockResolvedValue(undefined);
    presence.handleHeartbeat.mockResolvedValue({ status: 'ok', timestamp: 1 });
    service = new ExpertRealtimeService(
      presence as any,
      notification as any,
      chat as any,
      call as any,
    );
  });

  it('joins the expert room and registers presence on connect', async () => {
    await service.handleExpertConnect(socket, identity);
    expect(socket.join).toHaveBeenCalledWith('expert:42');
    expect(presence.registerConnection).toHaveBeenCalledWith(42, 's1');
  });

  it('unregisters presence on disconnect', async () => {
    await service.handleExpertDisconnect(socket, identity);
    expect(presence.unregisterConnection).toHaveBeenCalledWith(42, 's1');
  });

  it('routes heartbeat and presence calls to the presence handler', async () => {
    await service.handleHeartbeat(socket, identity);
    expect(presence.handleHeartbeat).toHaveBeenCalledWith(42, 's1');

    await service.subscribeExpertPresence(socket, 42);
    expect(presence.subscribeExpertPresence).toHaveBeenCalledWith(socket, 42);

    await service.unsubscribeExpertPresence(socket, 42);
    expect(presence.unsubscribeExpertPresence).toHaveBeenCalledWith(
      socket,
      42,
    );
  });

  it('routes notification/chat/call calls to their handlers', async () => {
    await service.subscribeNotifications(socket, identity);
    expect(notification.subscribeNotifications).toHaveBeenCalledWith(
      socket,
      identity,
    );

    await service.joinChat(socket, 100, identity);
    expect(chat.joinChat).toHaveBeenCalledWith(socket, 100, identity);

    service.relayChatTyping(socket, 100, true, identity);
    expect(chat.relayChatTyping).toHaveBeenCalledWith(
      socket,
      100,
      true,
      identity,
    );

    await service.joinCall(socket, 100, identity);
    expect(call.joinCall).toHaveBeenCalledWith(socket, 100, identity);

    const server: any = {};
    const end = { consultationId: 100 };
    await service.endCall(server, socket, end, identity);
    expect(call.endCall).toHaveBeenCalledWith(server, socket, end, identity);
  });
});
