import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RealtimeGateway } from '../realtime.gateway';
import { RealtimeAuthService } from '../services/realtime-auth.service';
import { ClientRealtimeService } from '@/internal/actors/client/realtime/client-realtime.service';
import { ExpertRealtimeService } from '@/internal/actors/expert/realtime/expert-realtime.service';

describe('RealtimeGateway (lifecycle only, /realtime namespace)', () => {
  let gateway: RealtimeGateway;
  let mockAuthService: { authenticate: ReturnType<typeof vi.fn> };
  let mockClientRealtimeService: {
    handleClientConnect: ReturnType<typeof vi.fn>;
    handleClientDisconnect: ReturnType<typeof vi.fn>;
  };
  let mockExpertRealtimeService: {
    handleExpertConnect: ReturnType<typeof vi.fn>;
    handleExpertDisconnect: ReturnType<typeof vi.fn>;
  };

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
    mockAuthService = { authenticate: vi.fn() };
    mockClientRealtimeService = {
      handleClientConnect: vi.fn().mockResolvedValue(undefined),
      handleClientDisconnect: vi.fn().mockResolvedValue(undefined),
    };
    mockExpertRealtimeService = {
      handleExpertConnect: vi.fn().mockResolvedValue(undefined),
      handleExpertDisconnect: vi.fn().mockResolvedValue(undefined),
    };

    gateway = new RealtimeGateway(
      mockAuthService as unknown as RealtimeAuthService,
      mockClientRealtimeService as unknown as ClientRealtimeService,
      mockExpertRealtimeService as unknown as ExpertRealtimeService,
    );
  });

  describe('Connection & Authentication', () => {
    it('handles anonymous connection with null auth data', async () => {
      const mockSocket: any = {
        id: 'anon-socket-1',
        handshake: { auth: {}, headers: {} },
        data: {},
      };

      await gateway.handleConnection(mockSocket);

      expect(mockSocket.data.auth).toBeNull();
      expect(
        mockClientRealtimeService.handleClientConnect,
      ).not.toHaveBeenCalled();
      expect(
        mockExpertRealtimeService.handleExpertConnect,
      ).not.toHaveBeenCalled();
    });

    it('authenticates client token and routes to client service', async () => {
      const mockSocket: any = {
        id: 'client-socket-1',
        handshake: { auth: { token: 'client-jwt' }, headers: {} },
        data: {},
      };
      mockAuthService.authenticate.mockResolvedValue(clientIdentity);

      await gateway.handleConnection(mockSocket);

      expect(mockAuthService.authenticate).toHaveBeenCalledWith('client-jwt');
      expect(mockSocket.data.auth).toEqual(clientIdentity);
      expect(
        mockClientRealtimeService.handleClientConnect,
      ).toHaveBeenCalledWith(mockSocket, clientIdentity);
    });

    it('authenticates expert token and routes to expert service', async () => {
      const mockSocket: any = {
        id: 'expert-socket-1',
        handshake: { auth: { token: 'expert-jwt' }, headers: {} },
        data: {},
      };
      mockAuthService.authenticate.mockResolvedValue(expertIdentity);

      await gateway.handleConnection(mockSocket);

      expect(mockAuthService.authenticate).toHaveBeenCalledWith('expert-jwt');
      expect(mockSocket.data.auth).toEqual(expertIdentity);
      expect(
        mockExpertRealtimeService.handleExpertConnect,
      ).toHaveBeenCalledWith(mockSocket, expertIdentity);
    });

    it('handles invalid token by clearing auth data', async () => {
      const mockSocket: any = {
        id: 'invalid-socket-1',
        handshake: { auth: { token: 'bad-token' }, headers: {} },
        data: {},
      };
      mockAuthService.authenticate.mockResolvedValue(null);

      await gateway.handleConnection(mockSocket);

      expect(mockSocket.data.auth).toBeNull();
      expect(
        mockClientRealtimeService.handleClientConnect,
      ).not.toHaveBeenCalled();
      expect(
        mockExpertRealtimeService.handleExpertConnect,
      ).not.toHaveBeenCalled();
    });
  });

  describe('Disconnect handling', () => {
    it('notifies expert service when expert socket disconnects', async () => {
      const mockSocket: any = {
        id: 'expert-socket-1',
        data: { auth: expertIdentity },
      };

      await gateway.handleDisconnect(mockSocket);

      expect(
        mockExpertRealtimeService.handleExpertDisconnect,
      ).toHaveBeenCalledWith(mockSocket, expertIdentity);
    });

    it('notifies client service when client socket disconnects', async () => {
      const mockSocket: any = {
        id: 'client-socket-1',
        data: { auth: clientIdentity },
      };

      await gateway.handleDisconnect(mockSocket);

      expect(
        mockClientRealtimeService.handleClientDisconnect,
      ).toHaveBeenCalledWith(mockSocket, clientIdentity);
    });
  });
});
