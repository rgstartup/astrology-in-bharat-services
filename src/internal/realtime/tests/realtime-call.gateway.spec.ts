import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RealtimeCallGateway } from '../gateways/realtime-call.gateway';
import { ClientRealtimeService } from '@/internal/actors/client/realtime/client-realtime.service';
import { ExpertRealtimeService } from '@/internal/actors/expert/realtime/expert-realtime.service';
import { SOCKET_EVENTS } from '../constants/socket-events.constant';

function actorServiceMock() {
  return {
    joinCall: vi
      .fn()
      .mockResolvedValue({ status: 'joined', consultationId: 100 }),
    relayCallSignal: vi.fn(),
    endCall: vi
      .fn()
      .mockResolvedValue({ status: 'left', consultationId: 100 }),
  };
}

describe('RealtimeCallGateway', () => {
  let gateway: RealtimeCallGateway;
  let mockClientRealtimeService: ReturnType<typeof actorServiceMock>;
  let mockExpertRealtimeService: ReturnType<typeof actorServiceMock>;
  let mockServer: { emit: ReturnType<typeof vi.fn> };

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
    mockServer = { emit: vi.fn() };

    gateway = new RealtimeCallGateway(
      mockClientRealtimeService as unknown as ClientRealtimeService,
      mockExpertRealtimeService as unknown as ExpertRealtimeService,
    );
    gateway.server = mockServer as any;
  });

  it('routes call join to the owning actor service', async () => {
    const mockSocket: any = {
      id: 'expert-socket-1',
      data: { auth: expertIdentity },
    };

    await gateway.handleCallJoin(
      mockSocket,
      { consultationId: 100 } as any,
      expertIdentity,
    );
    expect(mockExpertRealtimeService.joinCall).toHaveBeenCalledWith(
      mockSocket,
      100,
      expertIdentity,
    );
    expect(mockClientRealtimeService.joinCall).not.toHaveBeenCalled();
  });

  it('relays offer/answer/ice to the owning actor service', () => {
    const mockSocket: any = {
      id: 'client-socket-1',
      data: { auth: clientIdentity },
    };

    gateway.handleCallOffer(
      mockSocket,
      { consultationId: 100, offer: { sdp: 'o' } } as any,
      clientIdentity,
    );
    expect(mockClientRealtimeService.relayCallSignal).toHaveBeenCalledWith(
      mockSocket,
      SOCKET_EVENTS.CALL.OFFER,
      { consultationId: 100, offer: { sdp: 'o' } },
      clientIdentity,
    );

    gateway.handleCallAnswer(
      mockSocket,
      { consultationId: 100, answer: { sdp: 'a' } } as any,
      clientIdentity,
    );
    expect(mockClientRealtimeService.relayCallSignal).toHaveBeenCalledWith(
      mockSocket,
      SOCKET_EVENTS.CALL.ANSWER,
      { consultationId: 100, answer: { sdp: 'a' } },
      clientIdentity,
    );

    gateway.handleCallIceCandidate(
      mockSocket,
      { consultationId: 100, candidate: { c: 1 } } as any,
      clientIdentity,
    );
    expect(mockClientRealtimeService.relayCallSignal).toHaveBeenCalledWith(
      mockSocket,
      SOCKET_EVENTS.CALL.ICE_CANDIDATE,
      { consultationId: 100, candidate: { c: 1 } },
      clientIdentity,
    );
  });

  it('routes call end with the gateway server to the owning actor service', async () => {
    const mockSocket: any = {
      id: 'client-socket-1',
      data: { auth: clientIdentity },
    };

    await gateway.handleCallEnd(
      mockSocket,
      { consultationId: 100 } as any,
      clientIdentity,
    );
    expect(mockClientRealtimeService.endCall).toHaveBeenCalledWith(
      gateway.server,
      mockSocket,
      { consultationId: 100, reason: undefined },
      clientIdentity,
    );
  });
});
