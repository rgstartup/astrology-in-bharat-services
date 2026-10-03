import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RealtimeNotificationGateway } from '../gateways/realtime-notification.gateway';
import { ClientRealtimeService } from '@/internal/actors/client/realtime/client-realtime.service';
import { ExpertRealtimeService } from '@/internal/actors/expert/realtime/expert-realtime.service';

function actorServiceMock() {
  return {
    subscribeNotifications: vi
      .fn()
      .mockResolvedValue({ status: 'subscribed', room: 'client:10' }),
    acknowledgeNotificationRead: vi
      .fn()
      .mockResolvedValue({ status: 'ok', notificationId: 'n1' }),
  };
}

describe('RealtimeNotificationGateway', () => {
  let gateway: RealtimeNotificationGateway;
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

    gateway = new RealtimeNotificationGateway(
      mockClientRealtimeService as unknown as ClientRealtimeService,
      mockExpertRealtimeService as unknown as ExpertRealtimeService,
    );
  });

  it('routes notification subscribe/read to the owning actor service', async () => {
    const mockSocket: any = {
      id: 'client-socket-1',
      data: { auth: clientIdentity },
    };

    await gateway.handleNotificationSubscribe(mockSocket, clientIdentity);
    expect(
      mockClientRealtimeService.subscribeNotifications,
    ).toHaveBeenCalledWith(mockSocket, clientIdentity);

    await gateway.handleNotificationRead(
      mockSocket,
      { notificationId: 'n1' } as any,
      clientIdentity,
    );
    expect(
      mockClientRealtimeService.acknowledgeNotificationRead,
    ).toHaveBeenCalledWith('n1', clientIdentity);
  });

  it('routes expert notification subscribe to the expert service', async () => {
    const mockSocket: any = {
      id: 'expert-socket-1',
      data: { auth: expertIdentity },
    };

    await gateway.handleNotificationSubscribe(mockSocket, expertIdentity);
    expect(
      mockExpertRealtimeService.subscribeNotifications,
    ).toHaveBeenCalledWith(mockSocket, expertIdentity);
    expect(
      mockClientRealtimeService.subscribeNotifications,
    ).not.toHaveBeenCalled();
  });
});
