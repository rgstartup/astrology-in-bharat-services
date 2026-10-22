import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  joinConsultationRoom,
  leaveConsultationRoom,
  relayMediaSignal,
  type RoomMembershipDeps,
} from './consultation-room-membership';

/** Chainable drizzle mock: each terminal `limit()` pops the next queued rows. */
function dbMock(queuedRows: unknown[][]) {
  const queue = [...queuedRows];
  const limit = vi.fn(async () => queue.shift() ?? []);
  const where = vi.fn(() => ({ limit }));
  const leftJoin = vi.fn(() => ({ where }));
  const from = vi.fn(() => ({ where, leftJoin }));
  return { select: vi.fn(() => ({ from })) };
}

function depsMock(_participant: { client_id: number; expert_id: number }) {
  const rooms = { setActiveMode: vi.fn(async () => null) };
  const budget = {
    execute: vi.fn(async () => ({
      maxMinutes: 10,
      startedAt: '2026-01-01T00:00:00.000Z',
      elapsedSeconds: 5,
    })),
  };
  const orchestrator = {
    armBudgetTimer: vi.fn(),
    start: vi.fn(async () => ({})),
  };
  const markStarted = { execute: vi.fn(async () => null) };
  const voice = {
    generateToken: vi.fn(async () => ({
      token: 'tok',
      expiresAt: new Date('2030-01-01T00:00:00.000Z'),
    })),
  };
  return { rooms, budget, orchestrator, markStarted, voice };
}

const CLIENT = { actorType: 'client', id: 10, clientId: 10 };
const EXPERT = { actorType: 'expert', id: 42, expertId: 42 };
const PARTICIPANT = { client_id: 10, expert_id: 42 };

describe('joinConsultationRoom', () => {
  const server: any = {};
  let socket: any;

  beforeEach(() => {
    socket = { id: 's1', join: vi.fn(), leave: vi.fn() };
  });

  it('ignores non-participants without joining', async () => {
    const db = dbMock([[null]]);
    const deps = { db, ...depsMock(PARTICIPANT) } as unknown as RoomMembershipDeps;

    const ack = await joinConsultationRoom(
      deps,
      server,
      socket,
      100,
      'chat',
      { actorType: 'client', id: 99, clientId: 99 } as any,
    );

    expect(ack.status).toBe('ignored');
    expect(socket.join).not.toHaveBeenCalled();
  });

  it('meters chat joins at the chat rate without a voice token', async () => {
    const db = dbMock([
      [PARTICIPANT],
      [{ status: 'active' }],
      [{ accountName: 'C' }],
    ]);
    const { rooms, budget, orchestrator, markStarted, voice } =
      depsMock(PARTICIPANT);
    const deps = { db, rooms, budget, orchestrator, markStarted, voice } as unknown as RoomMembershipDeps;

    const ack = await joinConsultationRoom(
      deps,
      server,
      socket,
      100,
      'chat',
      CLIENT as any,
    );

    expect(socket.join).toHaveBeenCalledWith('consultation:100');
    expect(rooms.setActiveMode).toHaveBeenCalledWith(100, 'CHAT');
    expect(orchestrator.armBudgetTimer).toHaveBeenCalledWith(server, 100, 'chat');
    expect(voice.generateToken).not.toHaveBeenCalled();
    expect(ack).toMatchObject({
      status: 'joined',
      consultationId: 100,
      mode: 'chat',
      maxMinutes: 10,
      clientName: 'C',
    });
    expect(ack).not.toHaveProperty('token');
  });

  it('issues a voice token on voice joins', async () => {
    const db = dbMock([
      [PARTICIPANT],
      [{ status: 'active' }],
      [{ accountName: 'C' }],
    ]);
    const { rooms, budget, orchestrator, markStarted, voice } =
      depsMock(PARTICIPANT);
    const deps = { db, rooms, budget, orchestrator, markStarted, voice } as unknown as RoomMembershipDeps;

    const ack = await joinConsultationRoom(
      deps,
      server,
      socket,
      100,
      'voice',
      CLIENT as any,
    );

    expect(rooms.setActiveMode).toHaveBeenCalledWith(100, 'AUDIO_CALL');
    expect(orchestrator.armBudgetTimer).toHaveBeenCalledWith(server, 100, 'voice');
    expect(ack).toMatchObject({
      mode: 'voice',
      token: 'tok',
      channelName: 'consultation:voice:100',
    });
  });

  it('defers billing on voice join from accepted until both sides are media ready', async () => {
    const db = dbMock([
      [PARTICIPANT],
      [{ status: 'accepted' }],
      [{ accountName: 'C' }],
    ]);
    const { rooms, budget, orchestrator, markStarted, voice } =
      depsMock(PARTICIPANT);
    const deps = { db, rooms, budget, orchestrator, markStarted, voice } as unknown as RoomMembershipDeps;

    const ack = await joinConsultationRoom(
      deps,
      server,
      socket,
      100,
      'voice',
      EXPERT as any,
    );

    // Voice has a media handshake: the session starts on the second
    // `consultation:media_ready` report, never on a single join.
    expect(orchestrator.start).not.toHaveBeenCalled();
    expect(orchestrator.armBudgetTimer).not.toHaveBeenCalled();
    expect(ack.status).toBe('joined');
    expect(ack.consultationStatus).toBe('accepted');
    expect(ack).toMatchObject({ mode: 'voice', token: 'tok' });
  });

  it('starts billing on client join from accepted (symmetric for all actors)', async () => {
    const db = dbMock([
      [PARTICIPANT],
      [{ status: 'accepted' }],
      [{ accountName: 'C' }],
    ]);
    const { rooms, budget, orchestrator, markStarted, voice } =
      depsMock(PARTICIPANT);
    const deps = { db, rooms, budget, orchestrator, markStarted, voice } as unknown as RoomMembershipDeps;

    const ack = await joinConsultationRoom(
      deps,
      server,
      socket,
      100,
      'chat',
      CLIENT as any,
    );

    expect(orchestrator.start).toHaveBeenCalledWith(server, {
      consultationId: 100,
      actorId: 10,
      actorType: 'client',
    });
    expect(ack.status).toBe('joined');
    expect(ack.consultationStatus).toBe('active');
  });

  it('starts billing on the first expert join from accepted', async () => {
    const db = dbMock([
      [PARTICIPANT],
      [{ status: 'accepted' }],
      [{ accountName: 'C' }],
    ]);
    const { rooms, budget, orchestrator, markStarted, voice } =
      depsMock(PARTICIPANT);
    const deps = { db, rooms, budget, orchestrator, markStarted, voice } as unknown as RoomMembershipDeps;

    const ack = await joinConsultationRoom(deps, server, socket, 100, 'chat', EXPERT as any);

    expect(orchestrator.start).toHaveBeenCalledWith(server, {
      consultationId: 100,
      actorId: 42,
      actorType: 'expert',
    });
    expect(ack.status).toBe('joined');
    expect(ack.consultationStatus).toBe('active');
  });

  it('is idempotent on subsequent joins when already active', async () => {
    const db = dbMock([
      [PARTICIPANT],
      [{ status: 'active' }],
      [{ accountName: 'C' }],
    ]);
    const { rooms, budget, orchestrator, markStarted, voice } =
      depsMock(PARTICIPANT);
    const deps = { db, rooms, budget, orchestrator, markStarted, voice } as unknown as RoomMembershipDeps;

    const ack = await joinConsultationRoom(deps, server, socket, 100, 'chat', CLIENT as any);

    expect(orchestrator.start).not.toHaveBeenCalled();
    expect(orchestrator.armBudgetTimer).toHaveBeenCalledWith(server, 100, 'chat');
    expect(ack.status).toBe('joined');
    expect(ack.consultationStatus).toBe('active');
    expect(ack).toMatchObject({ maxMinutes: 10, startedAt: '2026-01-01T00:00:00.000Z', elapsedSeconds: 5 });
  });
});

describe('leaveConsultationRoom', () => {
  it('leaves the unified room plus legacy drains', async () => {
    const socket: any = { id: 's1', leave: vi.fn() };

    const ack = await leaveConsultationRoom(socket, 100, CLIENT as any);

    expect(socket.leave).toHaveBeenCalledWith('consultation:100');
    expect(socket.leave).toHaveBeenCalledWith('chat:100');
    expect(socket.leave).toHaveBeenCalledWith('call:100');
    expect(ack).toEqual({ status: 'left', consultationId: 100 });
  });

  it("revokes that side's media readiness when rooms are provided", async () => {
    const socket: any = { id: 's1', leave: vi.fn() };
    const rooms: any = { unmarkMediaReady: vi.fn(async () => null) };

    await leaveConsultationRoom(socket, 100, CLIENT as any, rooms);

    expect(rooms.unmarkMediaReady).toHaveBeenCalledWith(100, 'client');
  });
});

describe('relayMediaSignal', () => {
  it('emits into the consultation room', () => {
    const emit = vi.fn();
    const socket: any = { to: vi.fn(() => ({ emit })) };

    relayMediaSignal(
      socket,
      'consultation:media:offer',
      { consultationId: 100, offer: { sdp: 'o' } },
      CLIENT as any,
    );

    expect(socket.to).toHaveBeenCalledWith('consultation:100');
    expect(emit).toHaveBeenCalledWith(
      'consultation:media:offer',
      expect.objectContaining({ consultationId: 100 }),
    );
  });
});
