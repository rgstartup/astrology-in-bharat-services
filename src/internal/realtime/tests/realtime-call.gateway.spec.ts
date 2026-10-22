import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RealtimeCallGateway } from '../gateways/realtime-call.gateway';
import { ClientRealtimeService } from '@/internal/actors/client/realtime/client-realtime.service';
import { ExpertRealtimeService } from '@/internal/actors/expert/realtime/expert-realtime.service';
import { SOCKET_EVENTS } from '../constants/socket-events.constant';

function actorServiceMock() {
  return {
    relayMediaSignal: vi.fn(),
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
    expect(mockClientRealtimeService.relayMediaSignal).toHaveBeenCalledWith(
      mockSocket,
      SOCKET_EVENTS.MEDIA.OFFER,
      { consultationId: 100, offer: { sdp: 'o' } },
      clientIdentity,
    );

    gateway.handleCallAnswer(
      mockSocket,
      { consultationId: 100, answer: { sdp: 'a' } } as any,
      clientIdentity,
    );
    expect(mockClientRealtimeService.relayMediaSignal).toHaveBeenCalledWith(
      mockSocket,
      SOCKET_EVENTS.MEDIA.ANSWER,
      { consultationId: 100, answer: { sdp: 'a' } },
      clientIdentity,
    );

    gateway.handleCallIceCandidate(
      mockSocket,
      { consultationId: 100, candidate: { c: 1 } } as any,
      clientIdentity,
    );
    expect(mockClientRealtimeService.relayMediaSignal).toHaveBeenCalledWith(
      mockSocket,
      SOCKET_EVENTS.MEDIA.ICE_CANDIDATE,
      { consultationId: 100, candidate: { c: 1 } },
      clientIdentity,
    );
  });
});
