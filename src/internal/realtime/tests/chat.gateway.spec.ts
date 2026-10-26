import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatGateway } from '../gateways/chat.gateway';
import { ClientRealtimeService } from '@/internal/actors/client/realtime/client-realtime.service';
import { ExpertRealtimeService } from '@/internal/actors/expert/realtime/expert-realtime.service';

function actorServiceMock() {
  return {
    sendChatMessage: vi
      .fn()
      .mockResolvedValue({ status: 'sent', message: { consultationId: 100 } }),
    relayChatTyping: vi.fn(),
  };
}

describe('ChatGateway', () => {
  let gateway: ChatGateway;
  let mockClientRealtimeService: ReturnType<typeof actorServiceMock>;
  let mockExpertRealtimeService: ReturnType<typeof actorServiceMock>;

  const clientIdentity = {
    actorType: 'client' as const,
    id: 10,
    clientId: 10,
    email: 'client@test.com',
  };

  beforeEach(() => {
    mockClientRealtimeService = actorServiceMock();
    mockExpertRealtimeService = actorServiceMock();

    gateway = new ChatGateway(
      mockClientRealtimeService as unknown as ClientRealtimeService,
      mockExpertRealtimeService as unknown as ExpertRealtimeService,
      {
        accept: vi.fn(),
        reject: vi.fn(),
        end: vi.fn(),
        pause: vi.fn(),
        resume: vi.fn(),
        getStatus: vi.fn().mockResolvedValue({ state: 'active' }),
      } as any,
    );
  });

  it('routes client chat send to the client service', async () => {
    const mockSocket: any = {
      id: 'client-socket-1',
      data: { auth: clientIdentity },
    };

    await gateway.handleChatSend(
      mockSocket,
      { consultationId: 100, content: 'Hello' } as any,
      clientIdentity,
    );
    expect(mockClientRealtimeService.sendChatMessage).toHaveBeenCalledWith(
      undefined,
      mockSocket,
      expect.objectContaining({ consultationId: 100, content: 'Hello' }),
      clientIdentity,
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
