import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PresenceGateway } from '../presence.gateway';
import { PresenceService } from '../presence.service';
import { PRESENCE_EVENT_NAME } from '../presence.constants';
import { ExpertClientStatus } from '@/core/enums';

describe('PresenceGateway', () => {
  let gateway: PresenceGateway;
  let mockPresenceService: {
    connect: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
    heartbeat: ReturnType<typeof vi.fn>;
    getStatus: ReturnType<typeof vi.fn>;
  };
  let mockJwtService: {
    verifyAsync: ReturnType<typeof vi.fn>;
  };
  let mockServer: {
    emit: ReturnType<typeof vi.fn>;
    to: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockPresenceService = {
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockResolvedValue(undefined),
      heartbeat: vi.fn().mockResolvedValue(undefined),
      getStatus: vi.fn().mockResolvedValue('online'),
    };

    mockJwtService = {
      verifyAsync: vi.fn(),
    };

    const mockRoom = { emit: vi.fn() };
    mockServer = {
      emit: vi.fn(),
      to: vi.fn().mockReturnValue(mockRoom),
    };

    gateway = new PresenceGateway(
      mockPresenceService as unknown as PresenceService,
      mockJwtService as any,
    );
    gateway.server = mockServer as any;
  });

  describe('Connection & Authentication', () => {
    it('authenticates valid expert JWT and registers presence', async () => {
      const mockSocket: any = {
        id: 'socket-123',
        handshake: {
          auth: { token: 'valid-jwt-token' },
          headers: {},
        },
        data: {},
        join: vi.fn().mockResolvedValue(undefined),
      };

      mockJwtService.verifyAsync.mockResolvedValue({
        sub: 42,
        email: 'expert@test.com',
      });

      await gateway.handleConnection(mockSocket);

      expect(mockJwtService.verifyAsync).toHaveBeenCalledWith(
        'valid-jwt-token',
      );
      expect(mockSocket.data.expertId).toBe(42);
      expect(mockSocket.join).toHaveBeenCalledWith('expert_42');
      expect(mockPresenceService.connect).toHaveBeenCalledWith(
        42,
        'socket-123',
      );
    });

    it('handles connection without token as non-expert guest without error', async () => {
      const mockSocket: any = {
        id: 'guest-socket-1',
        handshake: {
          auth: {},
          headers: {},
        },
        data: {},
        join: vi.fn(),
      };

      await gateway.handleConnection(mockSocket);

      expect(mockPresenceService.connect).not.toHaveBeenCalled();
      expect(mockSocket.data.expertId).toBeUndefined();
    });
  });

  describe('Heartbeat', () => {
    it('accepts heartbeat from authenticated expert', async () => {
      const mockSocket: any = {
        id: 'socket-123',
        data: { expertId: 42 },
      };

      const result = await gateway.handleHeartbeat(mockSocket);

      expect(mockPresenceService.heartbeat).toHaveBeenCalledWith(
        42,
        'socket-123',
      );
      expect(result.status).toBe('ok');
    });

    it('rejects heartbeat from unauthenticated socket', async () => {
      const mockSocket: any = {
        id: 'unauth-socket',
        data: {},
      };

      const result = await gateway.handleHeartbeat(mockSocket);

      expect(mockPresenceService.heartbeat).not.toHaveBeenCalled();
      expect(result.status).toBe('error');
    });
  });

  describe('Disconnect', () => {
    it('disconnects expert socket and unregisters presence', async () => {
      const mockSocket: any = {
        id: 'socket-123',
        data: { expertId: 42 },
      };

      await gateway.handleDisconnect(mockSocket);

      expect(mockPresenceService.disconnect).toHaveBeenCalledWith(
        42,
        'socket-123',
      );
    });
  });

  describe('Event Broadcast', () => {
    it('broadcasts expert.presence.changed event to all clients and rooms', () => {
      const payload = {
        expertId: 42,
        status: ExpertClientStatus.BUSY,
        timestamp: new Date().toISOString(),
      };

      gateway.handlePresenceChanged(payload);

      expect(mockServer.emit).toHaveBeenCalledWith(
        PRESENCE_EVENT_NAME,
        payload,
      );
      expect(mockServer.to).toHaveBeenCalledWith('expert_42');
      expect(mockServer.to).toHaveBeenCalledWith('expert_presence_42');
    });
  });
});
