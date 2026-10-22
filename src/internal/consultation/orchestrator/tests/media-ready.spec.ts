import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConsultationOrchestratorService } from '../consultation-orchestrator.service';
import { SOCKET_EVENTS } from '@/internal/realtime/constants/socket-events.constant';

/** Chainable drizzle mock: each terminal `limit()` pops the next queued rows. */
function dbMock(queuedRows: unknown[][]) {
  const queue = [...queuedRows];
  const limit = vi.fn(async () => queue.shift() ?? []);
  const where = vi.fn(() => ({ limit }));
  const from = vi.fn(() => ({ where }));
  return { select: vi.fn(() => ({ from })) };
}

const CLIENT = { actorType: 'client', id: 10, clientId: 10 };
const EXPERT = { actorType: 'expert', id: 42, expertId: 42 };
const PARTICIPANT = [{ client_id: 10, expert_id: 42 }];

function serviceMock(db: any, rooms: any) {
  const emit = vi.fn();
  const server = { to: vi.fn(() => ({ emit })) } as any;
  const startUseCase = {
    execute: vi.fn(async () => ({
      payload: { mode: 'voice', state: 'active' },
    })),
  };
  const budget = {
    calculateAffordability: vi.fn(async () => ({ remainingSeconds: 600 })),
  };
  const service = new ConsultationOrchestratorService(
    db,
    rooms,
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
    budget as any,
  );
  return { service, server, emit, startUseCase };
}

describe('ConsultationOrchestratorService.mediaReady', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('records the first side without starting billing', async () => {
    const rooms = {
      markMediaReady: vi.fn(async () => ({
        clientReady: true,
        expertReady: false,
        bothReady: false,
      })),
    };
    const { service, server, emit, startUseCase } = serviceMock(
      dbMock([PARTICIPANT]),
      rooms,
    );

    const payload = await service.mediaReady(server, 100, CLIENT as any);

    expect(rooms.markMediaReady).toHaveBeenCalledWith(100, 'client');
    expect(payload).toMatchObject({
      consultationId: 100,
      actorType: 'client',
      bothReady: false,
    });
    expect(server.to).toHaveBeenCalledWith('consultation:100');
    expect(emit).toHaveBeenCalledWith(
      SOCKET_EVENTS.CONSULTATION.EVENTS.MEDIA_READY,
      expect.objectContaining({ bothReady: false }),
    );
    expect(startUseCase.execute).not.toHaveBeenCalled();
  });

  it('starts the metered session once both sides are media ready', async () => {
    const rooms = {
      markMediaReady: vi.fn(async () => ({
        clientReady: true,
        expertReady: true,
        bothReady: true,
      })),
    };
    const { service, server, emit, startUseCase } = serviceMock(
      dbMock([PARTICIPANT, [{ status: 'accepted' }]]),
      rooms,
    );

    const payload = await service.mediaReady(server, 100, EXPERT as any);

    expect(payload).toMatchObject({ bothReady: true });
    expect(emit).toHaveBeenCalledWith(
      SOCKET_EVENTS.CONSULTATION.EVENTS.MEDIA_READY,
      expect.objectContaining({ bothReady: true }),
    );
    expect(startUseCase.execute).toHaveBeenCalledWith(server, {
      consultationId: 100,
      actorId: 42,
      actorType: 'expert',
    });
  });

  it('does not start a consultation that already left the accepted state', async () => {
    const rooms = {
      markMediaReady: vi.fn(async () => ({
        clientReady: true,
        expertReady: true,
        bothReady: true,
      })),
    };
    const { service, server, startUseCase } = serviceMock(
      dbMock([PARTICIPANT, [{ status: 'active' }]]),
      rooms,
    );

    await service.mediaReady(server, 100, EXPERT as any);

    expect(startUseCase.execute).not.toHaveBeenCalled();
  });

  it('ignores non-participants', async () => {
    const rooms = { markMediaReady: vi.fn() };
    const { service, server, emit, startUseCase } = serviceMock(
      dbMock([[null]]),
      rooms,
    );

    const payload = await service.mediaReady(server, 100, {
      actorType: 'client',
      id: 99,
      clientId: 99,
    } as any);

    expect(payload).toBeNull();
    expect(rooms.markMediaReady).not.toHaveBeenCalled();
    expect(emit).not.toHaveBeenCalled();
    expect(startUseCase.execute).not.toHaveBeenCalled();
  });
});
