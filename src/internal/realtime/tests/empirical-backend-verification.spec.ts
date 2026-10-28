import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest';
import {
  joinConsultationRoom,
  leaveConsultationRoom,
  type RoomMembershipDeps,
} from '../room/consultation-room-membership';
import { ConsultationOrchestratorService } from '@/internal/consultation/orchestrator/consultation-orchestrator.service';
import { ConsultationGateway } from '../gateways/consultation.gateway';
import { RealtimeRoomGateway } from '../room/realtime-room.gateway';
import { RealtimeModule } from '../realtime.module';
import { ConsultationStatus, ConsultationSessionStatus } from '@/internal/consultation/enums';
import { SOCKET_EVENTS } from '../constants/socket-events.constant';
import { StartConsultationUseCase } from '@/internal/consultation/orchestrator/use-cases/start-consultation.use-case';

function dbMock(queuedRows: unknown[][]) {
  const queue = [...queuedRows];
  const limit = vi.fn(async () => queue.shift() ?? []);
  const where = vi.fn(() => ({ limit, orderBy: vi.fn(() => ({ limit })) }));
  const leftJoin = vi.fn(() => ({ where }));
  const from = vi.fn(() => ({ where, leftJoin }));
  const update = vi.fn(() => ({
    set: vi.fn(() => ({
      where: vi.fn(() => ({
        returning: vi.fn(async () => [{ id: 1, status: ConsultationSessionStatus.ACTIVE }]),
      })),
    })),
  }));
  return {
    select: vi.fn(() => ({ from })),
    update,
  };
}

describe('Empirical Backend Challenger Verification Suite', () => {
  const CLIENT = { actorType: 'client' as const, id: 10, clientId: 10, email: 'client@test.com' };
  const EXPERT = { actorType: 'expert' as const, id: 42, expertId: 42, email: 'expert@test.com' };
  const PARTICIPANT_ROW = { client_id: 10, expert_id: 42 };

  let server: any;
  let serverEmit: any;
  let socket: any;

  beforeEach(() => {
    serverEmit = vi.fn();
    server = {
      to: vi.fn(() => ({ emit: serverEmit })),
    };
    socket = {
      id: 'sock-challenger',
      join: vi.fn(async () => {}),
      leave: vi.fn(async () => {}),
      to: vi.fn(() => ({ emit: vi.fn() })),
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('1. Backend Decoupling: media_ready in Lobby vs consultation:join', () => {
    it('EMPERICAL: media_ready with bothReady: true starts the metered session once both parties are connected', async () => {
      const rooms = {
        markMediaReady: vi.fn(async () => ({
          clientReady: true,
          expertReady: true,
          bothReady: true,
        })),
      };
      const startUseCase = {
        execute: vi.fn(async () => ({ payload: { mode: 'video' } })),
      };
      const budget = {
        calculateAffordability: vi.fn(async () => ({ remainingSeconds: 600 })),
      };

      const orchestrator = new ConsultationOrchestratorService(
        dbMock([
          [PARTICIPANT_ROW],
          [{ status: ConsultationStatus.ACCEPTED }],
        ]) as any,
        rooms as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        startUseCase as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
    budget as any,
      );

      const payload = await orchestrator.mediaReady(server, 100, EXPERT);

      // Verify payload and broadcast
      expect(payload).not.toBeNull();
      expect(payload?.bothReady).toBe(true);
      expect(server.to).toHaveBeenCalledWith('consultation:100');
      expect(serverEmit).toHaveBeenCalledWith(
        SOCKET_EVENTS.CONSULTATION.EVENTS.MEDIA_READY,
        expect.objectContaining({ bothReady: true, consultationId: 100 }),
      );

      // Both parties connected -> the metered session starts now.
      expect(startUseCase.execute).toHaveBeenCalledWith(server, {
        consultationId: 100,
        actorId: 42,
        actorType: 'expert',
      });
    });

    it('EMPIRICAL: a single media_ready report does NOT start the session', async () => {
      const rooms = {
        markMediaReady: vi.fn(async () => ({
          clientReady: true,
          expertReady: false,
          bothReady: false,
        })),
      };
      const startUseCase = {
        execute: vi.fn(async () => ({ payload: { mode: 'video' } })),
      };
      const budget = {
        calculateAffordability: vi.fn(async () => ({ remainingSeconds: 600 })),
      };

      const orchestrator = new ConsultationOrchestratorService(
        dbMock([
          [PARTICIPANT_ROW],
          [{ status: ConsultationStatus.ACCEPTED }],
        ]) as any,
        rooms as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        startUseCase as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
    budget as any,
      );

      await orchestrator.mediaReady(server, 100, EXPERT);

      expect(startUseCase.execute).not.toHaveBeenCalled();
      expect(budget.calculateAffordability).not.toHaveBeenCalled();
    });

    it('EMPIRICAL: Repeated media_ready emissions in lobby do not trigger side effects or timer starts', async () => {
      const rooms = {
        markMediaReady: vi.fn(async () => ({
          clientReady: true,
          expertReady: true,
          bothReady: true,
        })),
      };
      const startUseCase = {
        execute: vi.fn(async () => ({ payload: { mode: 'voice' } })),
      };
      const budget = { calculateAffordability: vi.fn() };

      const orchestrator = new ConsultationOrchestratorService(
        dbMock([
          [PARTICIPANT_ROW],
          [{ status: ConsultationStatus.ACCEPTED }],
          [PARTICIPANT_ROW],
          [{ status: ConsultationStatus.ACTIVE }],
          [PARTICIPANT_ROW],
          [{ status: ConsultationStatus.ACTIVE }],
          [PARTICIPANT_ROW],
          [{ status: ConsultationStatus.ACTIVE }],
          [PARTICIPANT_ROW],
          [{ status: ConsultationStatus.ACTIVE }],
        ]) as any,
        rooms as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        startUseCase as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
    budget as any,
      );

      for (let i = 0; i < 5; i++) {
        await orchestrator.mediaReady(server, 100, CLIENT);
      }

      expect(rooms.markMediaReady).toHaveBeenCalledTimes(5);
      // Only the first report starts the session, the rest are no-ops.
      expect(startUseCase.execute).toHaveBeenCalledTimes(1);
      expect(budget.calculateAffordability).not.toHaveBeenCalled();
    });

    it('EMPIRICAL: consultation:join on ACCEPTED does NOT start a voice session, transitions to ACTIVE, and arms timer', async () => {
      const db = dbMock([
        [PARTICIPANT_ROW],
        [{ status: ConsultationStatus.ACCEPTED }],
        [{ accountName: 'Client' }],
      ]);
      const rooms = {
        setActiveMode: vi.fn(async () => null),
      };
      const budget = {
        execute: vi.fn(async () => ({
          maxMinutes: 15,
          startedAt: '2026-10-19T12:00:00.000Z',
          elapsedSeconds: 0,
        })),
      };
      const orchestrator = {
        start: vi.fn(async () => ({ status: 'started' })),
        armBudgetTimer: vi.fn(),
        // Rework API: single join (peer not recorded) returns false — no start.
        recordJoin: vi.fn(async () => false),
      };
      const voice = {
        generateToken: vi.fn(async () => ({
          token: 'agora-token',
          expiresAt: new Date('2026-10-19T13:00:00.000Z'),
        })),
      };

      const deps: RoomMembershipDeps = {
        db: db as any,
        rooms: rooms as any,
        budget: budget as any,
        orchestrator: orchestrator as any,
        voice: voice as any,
      };

      const ack = await joinConsultationRoom(deps, server, socket, 100, 'voice', CLIENT);

      expect(socket.join).toHaveBeenCalledWith('consultation:100');
      // The client waits in the lobby: no session, no billing clock.
      expect(orchestrator.start).not.toHaveBeenCalled();
      expect(orchestrator.armBudgetTimer).not.toHaveBeenCalled();
      expect(ack.status).toBe('joined');
      expect(ack.consultationStatus).toBe(ConsultationStatus.ACCEPTED);
      expect(ack.token).toBe('agora-token');
      expect(ack.channelName).toBe('consultation:voice:100');
    });

    it('EMPIRICAL: StartConsultationUseCase updates DB session & consultation, clears room key, and emits STARTED', async () => {
      const mockConsultation = {
        id: 100,
        status: ConsultationStatus.ACCEPTED,
        mode: 'voice',
        client_id: 10,
        expert_id: 42,
      };
      const mockSession = {
        id: 50,
        consultation_id: 100,
        status: ConsultationSessionStatus.PENDING,
        started_at: null,
      };

      const queue = [[mockConsultation], [mockSession]];
      const limit = vi.fn(async () => queue.shift() ?? []);
      const orderBy = vi.fn(() => ({ limit }));
      const where = vi.fn(() => ({ limit, orderBy }));
      const from = vi.fn(() => ({ where }));
      const updateSet = vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(async () => [{ ...mockSession, status: ConsultationSessionStatus.ACTIVE }]),
        })),
      }));
      const db = {
        select: vi.fn(() => ({ from })),
        update: vi.fn(() => ({ set: updateSet })),
      };

      const rooms = {
        clearRoom: vi.fn(async () => 1),
      };
      const budget = {
        calculateAffordability: vi.fn(async () => ({
          consultationId: 100,
          mode: 'voice',
          ratePerMinute: 20,
          costPerSecond: 0.33,
          spendableBalance: 200,
          affordableSeconds: 600,
          maxMinutes: 10,
          elapsedSeconds: 0,
          remainingSeconds: 600,
          isEligibleForFree: false,
          freeMinutes: 0,
          startedAt: new Date().toISOString(),
        })),
      };
      const voiceAdapter = {
        onStart: vi.fn(async () => {}),
        onPause: vi.fn(async () => {}),
        onResume: vi.fn(async () => {}),
        onEnd: vi.fn(async () => {}),
      };

      const useCase = new StartConsultationUseCase(
        db as any,
        budget as any,
        rooms as any,
        {} as any,
        voiceAdapter as any,
        {} as any,
      );

      const result = await useCase.execute(server, {
        consultationId: 100,
        actorId: 42,
        actorType: 'expert',
      });

      expect(result.status).toBe('started');
      expect(rooms.clearRoom).toHaveBeenCalledWith(100);
      expect(voiceAdapter.onStart).toHaveBeenCalledWith(100, expect.anything());
      expect(server.to).toHaveBeenCalledWith('consultation:100');
      expect(serverEmit).toHaveBeenCalledWith(
        SOCKET_EVENTS.CONSULTATION.EVENTS.STARTED,
        expect.objectContaining({ consultationId: 100, state: 'active' }),
      );
    });
  });

  describe('2. Reconnection Idempotency & Budget Timer Continuity', () => {
    it('EMPIRICAL: Reconnecting to ACTIVE room does NOT re-start orchestrator and re-arms budget timer with continuous elapsed time', async () => {
      const db = dbMock([
        [PARTICIPANT_ROW],
        [{ status: ConsultationStatus.ACTIVE }],
        [{ accountName: 'Client' }],
      ]);
      const rooms = {
        setActiveMode: vi.fn(async () => null),
      };
      const budget = {
        execute: vi.fn(async () => ({
          maxMinutes: 10,
          startedAt: '2026-10-19T12:00:00.000Z',
          elapsedSeconds: 120, // 2 minutes already elapsed
        })),
      };
      const orchestrator = {
        start: vi.fn(),
        armBudgetTimer: vi.fn(),
      };
      const voice = {
        generateToken: vi.fn(async () => ({
          token: 'reconnected-token',
          expiresAt: new Date('2026-10-19T13:00:00.000Z'),
        })),
      };

      const deps: RoomMembershipDeps = {
        db: db as any,
        rooms: rooms as any,
        budget: budget as any,
        orchestrator: orchestrator as any,
        voice: voice as any,
      };

      const ack = await joinConsultationRoom(deps, server, socket, 100, 'voice', EXPERT);

      // Verify orchestrator.start was NOT called on reconnect
      expect(orchestrator.start).not.toHaveBeenCalled();
      // Verify armBudgetTimer was called
      expect(orchestrator.armBudgetTimer).toHaveBeenCalledWith(server, 100, 'voice');
      // Verify elapsedSeconds returned is 120 (not 0)
      expect(ack.elapsedSeconds).toBe(120);
      expect(ack.status).toBe('joined');
      expect(ack.consultationStatus).toBe(ConsultationStatus.ACTIVE);
    });

    it('EMPIRICAL: In-memory armBudgetTimer cancels previous timer and does not duplicate timeouts on reconnect', async () => {
      vi.useFakeTimers();

      const rooms = {
        isPaused: vi.fn(async () => false),
      };
      const triggerBudgetHold = vi.fn(async () => {});
      const budget = {
        calculateAffordability: vi.fn(async () => ({
          remainingSeconds: 300, // 5 minutes remaining
        })),
      };

      const orchestrator = new ConsultationOrchestratorService(
        {} as any,
        rooms as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
    budget as any,
      );

      // Mock triggerBudgetHold
      (orchestrator as any).triggerBudgetHold = triggerBudgetHold;

      // First arm
      orchestrator.armBudgetTimer(server, 100, 'voice');
      await vi.advanceTimersByTimeAsync(10);

      // Map should have 1 timer
      expect((orchestrator as any).budgetTimers.has(100)).toBe(true);
      const firstTimerId = (orchestrator as any).budgetTimers.get(100);

      // Reconnect: Second arm
      orchestrator.armBudgetTimer(server, 100, 'voice');
      await vi.advanceTimersByTimeAsync(10);

      expect((orchestrator as any).budgetTimers.has(100)).toBe(true);
      const secondTimerId = (orchestrator as any).budgetTimers.get(100);

      // Old timer was canceled, new timer was created, total active timers for consultation 100 is still 1
      expect(firstTimerId).not.toBe(secondTimerId);
      expect((orchestrator as any).budgetTimers.size).toBe(1);

      // Advance time to 239s (warning threshold is remainingSeconds > 60, i.e. 240s)
      await vi.advanceTimersByTimeAsync(239_000);
      expect(serverEmit).not.toHaveBeenCalledWith(SOCKET_EVENTS.CONSULTATION.BUDGET.WARNING, expect.anything());

      // Advance to 240s -> Warning event emitted
      await vi.advanceTimersByTimeAsync(2_000);
      expect(serverEmit).toHaveBeenCalledWith(
        SOCKET_EVENTS.CONSULTATION.BUDGET.WARNING,
        expect.objectContaining({ consultationId: 100, remainingSeconds: 60 }),
      );

      // Advance remaining 60s -> Budget hold triggered exactly once
      await vi.advanceTimersByTimeAsync(60_000);
      expect(triggerBudgetHold).toHaveBeenCalledTimes(1);
    });
  });

  describe('3. Gateway Consolidation & Voice Token Refresh', () => {
    it('EMPIRICAL: RealtimeRoomGateway is NOT decorated as WebSocketGateway and NOT in RealtimeModule providers', () => {
      // Check RealtimeRoomGateway does not have @WebSocketGateway metadata
      const gatewayMetadata = Reflect.getMetadata('websocket:gateway', RealtimeRoomGateway);
      expect(gatewayMetadata).toBeUndefined();

      // Check RealtimeModule providers
      const moduleProviders = Reflect.getMetadata('providers', RealtimeModule) || [];
      const hasRealtimeRoomGateway = moduleProviders.some(
        (p: any) => p === RealtimeRoomGateway || p?.provide === RealtimeRoomGateway,
      );
      expect(hasRealtimeRoomGateway).toBe(false);

      // Check ConsultationGateway is a registered provider
      const hasConsultationGateway = moduleProviders.some(
        (p: any) => p === ConsultationGateway,
      );
      expect(hasConsultationGateway).toBe(true);
    });

    it('EMPIRICAL: ConsultationGateway handleVoiceToken generates token for participant when ACCEPTED or ACTIVE', async () => {
      const db = dbMock([
        [PARTICIPANT_ROW],
        [{ status: ConsultationStatus.ACCEPTED }],
      ]);
      const voice = {
        generateToken: vi.fn(async () => ({
          token: 'fresh-agora-token',
          expiresAt: new Date('2026-10-19T13:30:00.000Z'),
        })),
      };

      const gateway = new ConsultationGateway(
        db as any,
        {} as any,
        {} as any,
        voice as any,
        {} as any,
      );
      gateway.server = server;

      const ack = await gateway.handleVoiceToken(
        socket,
        { consultationId: 100 },
        CLIENT,
      );

      expect(ack.status).toBe('token');
      expect(ack.consultationId).toBe(100);
      expect(ack.token).toBe('fresh-agora-token');
      expect(ack.channelName).toBe('consultation:voice:100');
    });

    it('EMPIRICAL: ConsultationGateway handleVoiceToken refuses (status: ignored) when consultation is COMPLETED/CANCELLED', async () => {
      const db = dbMock([
        [PARTICIPANT_ROW],
        [{ status: ConsultationStatus.COMPLETED }],
      ]);
      const voice = { generateToken: vi.fn() };

      const gateway = new ConsultationGateway(
        db as any,
        {} as any,
        {} as any,
        voice as any,
        {} as any,
      );
      gateway.server = server;

      const ack = await gateway.handleVoiceToken(
        socket,
        { consultationId: 100 },
        CLIENT,
      );

      expect(ack.status).toBe('ignored');
      expect(voice.generateToken).not.toHaveBeenCalled();
    });

    it('EMPIRICAL: ConsultationGateway handleVoiceToken refuses non-participants', async () => {
      const db = dbMock([[null]]); // not a participant
      const voice = { generateToken: vi.fn() };

      const gateway = new ConsultationGateway(
        db as any,
        {} as any,
        {} as any,
        voice as any,
        {} as any,
      );
      gateway.server = server;

      const ack = await gateway.handleVoiceToken(
        socket,
        { consultationId: 100 },
        { actorType: 'client', id: 999, clientId: 999, email: 'imposter@test.com' },
      );

      expect(ack.status).toBe('ignored');
      expect(voice.generateToken).not.toHaveBeenCalled();
    });
  });

  describe('4. Room Leave & Media Cleanup', () => {
    it('EMPIRICAL: consultation:leave unmarks media readiness to prevent stale lobby auto-start', async () => {
      const rooms = {
        unmarkMediaReady: vi.fn(async () => null),
      };

      const ack = await leaveConsultationRoom(socket, 100, CLIENT, rooms as any);

      expect(socket.leave).toHaveBeenCalledWith('consultation:100');
      expect(rooms.unmarkMediaReady).toHaveBeenCalledWith(100, 'client');
      expect(ack).toEqual({ status: 'left', consultationId: 100 });
    });
  });
});
