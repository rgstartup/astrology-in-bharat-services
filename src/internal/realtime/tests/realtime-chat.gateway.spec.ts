import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RealtimeChatGateway } from '../gateways/realtime-chat.gateway';
import { ClientRealtimeService } from '@/internal/actors/client/realtime/client-realtime.service';
import { ExpertRealtimeService } from '@/internal/actors/expert/realtime/expert-realtime.service';

function actorServiceMock() {
  return {
    joinChat: vi
      .fn()
      .mockResolvedValue({ status: 'joined', consultationId: 100 }),
    leaveChat: vi
      .fn()
      .mockResolvedValue({ status: 'left', consultationId: 100 }),
    sendChatMessage: vi
      .fn()
      .mockResolvedValue({ status: 'sent', message: { consultationId: 100 } }),
    relayChatTyping: vi.fn(),
  };
}

describe('RealtimeChatGateway', () => {
  let gateway: RealtimeChatGateway;
  let mockClientRealtimeService: ReturnType<typeof actorServiceMock>;
  let mockExpertRealtimeService: ReturnType<typeof actorServiceMock>;

  const clientIdentity = {
    actorType: 'client' as const,
    id: 10,
    clientId: 10,
    email: 'client@test.com',
  };
  const expertIdentity = {
    actorType: 'expert' as const,
    id: 42,
    expertId: 42,
    email: 'expert@test.com',
  };

  beforeEach(() => {
    mockClientRealtimeService = actorServiceMock();
    mockExpertRealtimeService = actorServiceMock();

    gateway = new RealtimeChatGateway(
      mockClientRealtimeService as unknown as ClientRealtimeService,
      mockExpertRealtimeService as unknown as ExpertRealtimeService,
    );
  });

  it('routes client chat join/send to the client service', async () => {
    const mockSocket: any = {
      id: 'client-socket-1',
      data: { auth: clientIdentity },
    };

    await gateway.handleChatJoin(
      mockSocket,
      { consultationId: 100 } as any,
      clientIdentity,
    );
    expect(mockClientRealtimeService.joinChat).toHaveBeenCalledWith(
      mockSocket,
      100,
      clientIdentity,
    );
    expect(mockExpertRealtimeService.joinChat).not.toHaveBeenCalled();

    await gateway.handleChatSend(
      mockSocket,
      { consultationId: 100, content: 'Hello' } as any,
      clientIdentity,
    );
    expect(mockClientRealtimeService.sendChatMessage).toHaveBeenCalledWith(
      mockSocket,
      expect.objectContaining({ consultationId: 100, content: 'Hello' }),
      clientIdentity,
    );
  });

  it('routes expert chat join/leave to the expert service', async () => {
    const mockSocket: any = {
      id: 'expert-socket-1',
      data: { auth: expertIdentity },
    };

    await gateway.handleChatJoin(
      mockSocket,
      { consultationId: 100 } as any,
      expertIdentity,
    );
    expect(mockExpertRealtimeService.joinChat).toHaveBeenCalledWith(
      mockSocket,
      100,
      expertIdentity,
    );
    expect(mockClientRealtimeService.joinChat).not.toHaveBeenCalled();

    await gateway.handleChatLeave(
      mockSocket,
      { consultationId: 100 } as any,
      expertIdentity,
    );
    expect(mockExpertRealtimeService.leaveChat).toHaveBeenCalledWith(
      mockSocket,
      100,
      expertIdentity,
    );
  });

  it('relays typing indicator to the owning actor service', () => {
    const mockSocket: any = {
      id: 'client-socket-1',
      data: { auth: clientIdentity },
    };

    gateway.handleChatTyping(
      mockSocket,
      { consultationId: 100, isTyping: true } as any,
      clientIdentity,
    );
    expect(mockClientRealtimeService.relayChatTyping).toHaveBeenCalledWith(
      mockSocket,
      100,
      true,
      clientIdentity,
    );
  });
});
