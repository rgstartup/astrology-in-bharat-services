import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RealtimePresenceGateway } from '../gateways/realtime-presence.gateway';
import { ClientRealtimeService } from '@/internal/actors/client/realtime/client-realtime.service';
import { ExpertRealtimeService } from '@/internal/actors/expert/realtime/expert-realtime.service';
import { SOCKET_EVENTS } from '../constants/socket-events.constant';
import { SOCKET_ROOMS } from '../constants/socket-rooms.constant';
import { ExpertClientStatus } from '@/core/enums';

describe('RealtimePresenceGateway', () => {
  let gateway: RealtimePresenceGateway;
  let mockClientRealtimeService: {
    subscribeExpertPresence: ReturnType<typeof vi.fn>;
    unsubscribeExpertPresence: ReturnType<typeof vi.fn>;
  };
  let mockExpertRealtimeService: {
    handleHeartbeat: ReturnType<typeof vi.fn>;
  };
  let mockServer: {
    emit: ReturnType<typeof vi.fn>;
    to: ReturnType<typeof vi.fn>;
  };

  const expertIdentity = {
    actorType: 'expert' as const,
    id: 42,
    expertId: 42,
    email: 'expert@test.com',
  };

  beforeEach(() => {
    mockClientRealtimeService = {
      subscribeExpertPresence: vi
        .fn()
        .mockResolvedValue({ expertId: 42, status: 'subscribed' }),
      unsubscribeExpertPresence: vi
        .fn()
        .mockResolvedValue({ expertId: 42, status: 'unsubscribed' }),
    };
    mockExpertRealtimeService = {
      handleHeartbeat: vi
        .fn()
        .mockResolvedValue({ status: 'ok', timestamp: Date.now() }),
    };

    const mockRoom = { emit: vi.fn() };
    mockServer = {
      emit: vi.fn(),
      to: vi.fn().mockReturnValue(mockRoom),
    };

    gateway = new RealtimePresenceGateway(
      mockClientRealtimeService as unknown as ClientRealtimeService,
      mockExpertRealtimeService as unknown as ExpertRealtimeService,
    );
    gateway.server = mockServer as any;
  });

  it('routes presence subscribe/unsubscribe through client service', async () => {
    const mockSocket: any = { id: 's1', data: { auth: null } };

    const result = await gateway.handlePresenceSubscribe(mockSocket, {
      expertId: 42,
    } as any);

    expect(
      mockClientRealtimeService.subscribeExpertPresence,
    ).toHaveBeenCalledWith(mockSocket, 42);
    expect(result).toEqual({ expertId: 42, status: 'subscribed' });

    await gateway.handlePresenceUnsubscribe(mockSocket, {
      expertId: 42,
    } as any);
    expect(
      mockClientRealtimeService.unsubscribeExpertPresence,
    ).toHaveBeenCalledWith(mockSocket, 42);
  });

  it('accepts heartbeat from expert identity', async () => {
    const mockSocket: any = {
      id: 'expert-socket-1',
      data: { auth: expertIdentity },
    };

    const result = await gateway.handlePresenceHeartbeat(
      mockSocket,
      expertIdentity,
    );

    expect(mockExpertRealtimeService.handleHeartbeat).toHaveBeenCalledWith(
      mockSocket,
      expertIdentity,
    );
    expect(result.status).toBe('ok');
  });

  it('broadcasts presence update to /realtime namespace and expert rooms', () => {
    const payload = {
      expertId: 42,
      status: ExpertClientStatus.BUSY,
      timestamp: new Date().toISOString(),
    };

    gateway.handlePresenceChanged(payload);

    expect(mockServer.emit).toHaveBeenCalledWith(
      SOCKET_EVENTS.PRESENCE.UPDATED,
      payload,
    );
    expect(mockServer.to).toHaveBeenCalledWith(
      SOCKET_ROOMS.EXPERT_PRESENCE(42),
    );
    expect(mockServer.to).toHaveBeenCalledWith(SOCKET_ROOMS.EXPERT(42));
  });
});
