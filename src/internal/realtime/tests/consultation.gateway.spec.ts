import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConsultationGateway } from '../gateways/consultation.gateway';
import { ConsultationStatus } from '@/internal/consultation/enums';

function mockDb(participant = true, status: ConsultationStatus = ConsultationStatus.ACTIVE) {
  const queue = participant
    ? [[{ client_id: 10, expert_id: 42 }], [{ status }], [{ accountName: 'Test' }]]
    : [[]];
  const limit = vi.fn(async () => queue.shift() ?? []);
  const where = vi.fn(() => ({ limit }));
  const leftJoin = vi.fn(() => ({ where }));
  const from = vi.fn(() => ({ where, leftJoin }));
  return { select: vi.fn(() => ({ from })) };
}

describe('ConsultationGateway', () => {
  let gateway: ConsultationGateway;
  let db: any;
  let rooms: any;
  let budget: any;
  let voice: any;
  let orchestrator: any;
  let server: any;
  let socket: any;

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
    db = mockDb(true);
    rooms = {
      setActiveMode: vi.fn(async () => null),
      unmarkMediaReady: vi.fn(async () => null),
    };
    budget = {
      execute: vi.fn(async () => ({
        maxMinutes: 15,
        startedAt: '2026-10-19T10:00:00.000Z',
        elapsedSeconds: 0,
      })),
    };
    voice = {
      generateToken: vi.fn(async () => ({
        token: 'voice-token-123',
        expiresAt: new Date('2030-01-01T00:00:00.000Z'),
      })),
    };
    orchestrator = {
      onServerReady: vi.fn(),
      start: vi.fn(async () => ({ status: 'started' })),
      pause: vi.fn(async () => ({ status: 'paused' })),
      resume: vi.fn(async () => ({ status: 'resumed' })),
      end: vi.fn(async () => ({ status: 'ended' })),
      accept: vi.fn(async () => ({ status: 'accepted' })),
      reject: vi.fn(async () => ({ status: 'rejected' })),
      request: vi.fn(async () => ({ status: 'requested' })),
      cancel: vi.fn(async () => ({ status: 'cancelled' })),
      getStatus: vi.fn(async () => ({ state: 'active' })),
      armBudgetTimer: vi.fn(),
      mediaReady: vi.fn(async () => ({ bothReady: true })),
    };
    const emit = vi.fn();
    server = { to: vi.fn(() => ({ emit })) };
    socket = { id: 'sock-1', join: vi.fn(), leave: vi.fn() };

    gateway = new ConsultationGateway(
      db,
      rooms,
      budget,
      voice,
      orchestrator,
    );
    gateway.server = server;
  });

  describe('handleVoiceToken', () => {
    it('returns a refreshed voice token for an active participant', async () => {
      const ack = await gateway.handleVoiceToken(
        socket,
        { consultationId: 100 },
        clientIdentity,
      );

      expect(ack.status).toBe('token');
      expect(ack.consultationId).toBe(100);
      expect(ack.token).toBe('voice-token-123');
      expect(ack.channelName).toBe('consultation:voice:100');
    });

    it('ignores non-participants requesting voice token', async () => {
      const nonParticipantDb = mockDb(false);
      const nonPartGateway = new ConsultationGateway(
        nonParticipantDb as any,
        rooms,
        budget,
        voice,
        orchestrator,
      );
      nonPartGateway.server = server;

      const ack = await nonPartGateway.handleVoiceToken(
        socket,
        { consultationId: 100 },
        { actorType: 'client', id: 99, clientId: 99, email: 'other@test.com' },
      );

      expect(ack.status).toBe('ignored');
      expect(voice.generateToken).not.toHaveBeenCalled();
    });
  });

  describe('handleJoin', () => {
    it('joins consultation room for client', async () => {
      const ack: any = await gateway.handleJoin(
        socket,
        { consultationId: 100, mode: 'chat' },
        clientIdentity,
      );

      expect(socket.join).toHaveBeenCalledWith('consultation:100');
      expect(ack.status).toBe('joined');
      expect(ack.consultationId).toBe(100);
    });

    it('joins consultation room for expert', async () => {
      const ack: any = await gateway.handleJoin(
        socket,
        { consultationId: 100, mode: 'voice' },
        expertIdentity,
      );

      expect(socket.join).toHaveBeenCalledWith('consultation:100');
      expect(ack.status).toBe('joined');
      expect(ack.mode).toBe('voice');
      expect(ack.token).toBe('voice-token-123');
    });

    it('ignores unknown actor types', async () => {
      const ack = await gateway.handleJoin(
        socket,
        { consultationId: 100, mode: 'chat' },
        { actorType: 'admin' as any, id: 1, email: 'admin@test.com' } as any,
      );

      expect(ack.status).toBe('ignored');
      expect(socket.join).not.toHaveBeenCalled();
    });
  });

  describe('handleLeave', () => {
    it('leaves consultation room and unmarks media readiness', async () => {
      const ack = await gateway.handleLeave(
        socket,
        { consultationId: 100 },
        clientIdentity,
      );

      expect(socket.leave).toHaveBeenCalledWith('consultation:100');
      expect(rooms.unmarkMediaReady).toHaveBeenCalledWith(100, 'client');
      expect(ack.status).toBe('left');
    });
  });

  describe('handleMediaReady', () => {
    it('delegates to orchestrator.mediaReady', async () => {
      const ack = await gateway.handleMediaReady(
        socket,
        { consultationId: 100 },
        clientIdentity,
      );

      expect(orchestrator.mediaReady).toHaveBeenCalledWith(
        server,
        100,
        clientIdentity,
        socket,
      );
      expect(ack).toEqual({ bothReady: true });
    });
  });

  describe('handleStart', () => {
    it('delegates start command to orchestrator', async () => {
      await gateway.handleStart(
        socket,
        { consultationId: 100 },
        expertIdentity,
      );

      expect(orchestrator.start).toHaveBeenCalledWith(server, {
        consultationId: 100,
        actorId: 42,
        actorType: 'expert',
      });
    });
  });

  describe('handlePause, handleResume, handleEnd, handleGetStatus', () => {
    it('delegates pause command to orchestrator', async () => {
      await gateway.handlePause(
        socket,
        { consultationId: 100 },
        clientIdentity,
      );

      expect(orchestrator.pause).toHaveBeenCalledWith(server, {
        consultationId: 100,
        actorId: 10,
        actorType: 'client',
        reason: 'manual',
      });
    });

    it('delegates resume command to orchestrator', async () => {
      await gateway.handleResume(
        socket,
        { consultationId: 100 },
        expertIdentity,
      );

      expect(orchestrator.resume).toHaveBeenCalledWith(server, {
        consultationId: 100,
        actorId: 42,
        actorType: 'expert',
      });
    });

    it('delegates end command to orchestrator', async () => {
      await gateway.handleEnd(
        socket,
        { consultationId: 100, reason: 'finished' },
        clientIdentity,
      );

      expect(orchestrator.end).toHaveBeenCalledWith(server, {
        consultationId: 100,
        actorId: 10,
        actorType: 'client',
        reason: 'finished',
      });
    });

    it('delegates getStatus query to orchestrator', async () => {
      const status = await gateway.handleGetStatus(
        socket,
        { consultationId: 100 },
      );

      expect(orchestrator.getStatus).toHaveBeenCalledWith(100);
      expect(status).toEqual({ state: 'active' });
    });
  });

  describe('handleAccept and handleReject', () => {
    it('allows experts to accept consultations', async () => {
      await gateway.handleAccept(
        socket,
        { consultationId: 100 },
        expertIdentity,
      );

      expect(socket.join).toHaveBeenCalledWith('consultation:100');
      expect(orchestrator.accept).toHaveBeenCalledWith(server, {
        consultationId: 100,
        actorId: 42,
        actorType: 'expert',
      });
    });

    it('rejects client attempts to accept consultation', async () => {
      const ack = await gateway.handleAccept(
        socket,
        { consultationId: 100 },
        clientIdentity,
      );

      expect(ack.status).toBe('ignored');
      expect(orchestrator.accept).not.toHaveBeenCalled();
    });

    it('allows experts to reject consultations', async () => {
      await gateway.handleReject(
        socket,
        { consultationId: 100, reason: 'busy' },
        expertIdentity,
      );

      expect(orchestrator.reject).toHaveBeenCalledWith(server, {
        consultationId: 100,
        actorId: 42,
        actorType: 'expert',
        reason: 'busy',
      });
    });

    it('rejects client attempts to reject consultation', async () => {
      const ack = await gateway.handleReject(
        socket,
        { consultationId: 100 },
        clientIdentity,
      );

      expect(ack.status).toBe('ignored');
      expect(orchestrator.reject).not.toHaveBeenCalled();
    });
  });
});
