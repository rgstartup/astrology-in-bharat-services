import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RealtimeRoomGateway } from '../room/realtime-room.gateway';
import { ClientRealtimeService } from '@/internal/actors/client/realtime/client-realtime.service';
import { ExpertRealtimeService } from '@/internal/actors/expert/realtime/expert-realtime.service';

function actorServiceMock() {
  return {
    joinConsultation: vi
      .fn()
      .mockResolvedValue({ status: 'joined', consultationId: 100 }),
    leaveConsultation: vi
      .fn()
      .mockResolvedValue({ status: 'left', consultationId: 100 }),
  };
}

describe('RealtimeRoomGateway', () => {
  let gateway: RealtimeRoomGateway;
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

    gateway = new RealtimeRoomGateway(
      mockClientRealtimeService as unknown as ClientRealtimeService,
      mockExpertRealtimeService as unknown as ExpertRealtimeService,
    );
  });

  it('routes join with mode to the owning actor service', async () => {
    const mockSocket: any = { id: 's1' };

    await gateway.handleRoomJoin(
      mockSocket,
      { consultationId: 100, mode: 'voice' } as any,
      expertIdentity,
    );
    expect(mockExpertRealtimeService.joinConsultation).toHaveBeenCalledWith(
      undefined,
      mockSocket,
      100,
      'voice',
      expertIdentity,
    );
    expect(mockClientRealtimeService.joinConsultation).not.toHaveBeenCalled();
  });

  it('defaults join mode to chat', async () => {
    const mockSocket: any = { id: 's1' };

    await gateway.handleRoomJoin(
      mockSocket,
      { consultationId: 100 } as any,
      clientIdentity,
    );
    expect(mockClientRealtimeService.joinConsultation).toHaveBeenCalledWith(
      undefined,
      mockSocket,
      100,
      'chat',
      clientIdentity,
    );
  });

  it('routes leave to the owning actor service', async () => {
    const mockSocket: any = { id: 's1' };

    await gateway.handleRoomLeave(
      mockSocket,
      { consultationId: 100 } as any,
      clientIdentity,
    );
    expect(mockClientRealtimeService.leaveConsultation).toHaveBeenCalledWith(
      mockSocket,
      100,
      clientIdentity,
    );
    expect(mockExpertRealtimeService.leaveConsultation).not.toHaveBeenCalled();
  });
});
