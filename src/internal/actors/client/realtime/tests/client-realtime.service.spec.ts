import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ClientRealtimeService } from '../client-realtime.service';

function handlerMock(methods: string[]) {
  return Object.fromEntries(methods.map((m) => [m, vi.fn()]));
}

describe('ClientRealtimeService (delegates to domain handlers)', () => {
  let service: ClientRealtimeService;
  let presence: ReturnType<typeof handlerMock>;
  let notification: ReturnType<typeof handlerMock>;
  let chat: ReturnType<typeof handlerMock>;
  let call: ReturnType<typeof handlerMock>;

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
    service = new ClientRealtimeService(
      presence as any,
      notification as any,
      chat as any,
      call as any,
    );
  });

  it('routes presence calls to the presence handler', async () => {
    await service.subscribeExpertPresence(socket, 42);
    expect(presence.subscribeExpertPresence).toHaveBeenCalledWith(socket, 42);

    await service.unsubscribeExpertPresence(socket, 42);
    expect(presence.unsubscribeExpertPresence).toHaveBeenCalledWith(
      socket,
      42,
    );
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
    await service.joinChat(socket, 100, identity);
    expect(chat.joinChat).toHaveBeenCalledWith(socket, 100, identity);

    await service.leaveChat(socket, 100, identity);
    expect(chat.leaveChat).toHaveBeenCalledWith(socket, 100, identity);

    const input = { consultationId: 100, content: 'Hi' };
    await service.sendChatMessage(socket, input, identity);
    expect(chat.sendChatMessage).toHaveBeenCalledWith(socket, input, identity);

    service.relayChatTyping(socket, 100, true, identity);
    expect(chat.relayChatTyping).toHaveBeenCalledWith(
      socket,
      100,
      true,
      identity,
    );
  });

  it('routes call calls to the call handler', async () => {
    await service.joinCall(socket, 100, identity);
    expect(call.joinCall).toHaveBeenCalledWith(socket, 100, identity);

    await service.leaveCall(socket, 100, identity);
    expect(call.leaveCall).toHaveBeenCalledWith(socket, 100, identity);

    const signal = { consultationId: 100, offer: { sdp: 'o' } };
    service.relayCallSignal(socket, 'call:offer', signal, identity);
    expect(call.relayCallSignal).toHaveBeenCalledWith(
      socket,
      'call:offer',
      signal,
      identity,
    );

    const server: any = {};
    const end = { consultationId: 100 };
    await service.endCall(server, socket, end, identity);
    expect(call.endCall).toHaveBeenCalledWith(server, socket, end, identity);
  });

  it('joins the client room on connect without touching handlers', async () => {
    await service.handleClientConnect(socket, identity);
    expect(socket.join).toHaveBeenCalledWith('client:10');
  });
});
