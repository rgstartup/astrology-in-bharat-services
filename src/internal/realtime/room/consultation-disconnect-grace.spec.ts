import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  consultationDisconnectGrace,
  consultationDisconnectGraceMs,
  hasLiveActorSocket,
} from './consultation-disconnect-grace';
import { closeActiveConsultationSessions } from './consultation-session-settlement';

vi.mock('./consultation-session-settlement', () => ({
  closeActiveConsultationSessions: vi.fn().mockResolvedValue([]),
}));

const mockedClose = vi.mocked(closeActiveConsultationSessions);

function socketServer(sockets: unknown[]) {
  return {
    sockets: {
      sockets: new Map(sockets.map((s, i) => [String(i), s])),
    },
  } as any;
}

function namespaceServer(sockets: unknown[]) {
  return { sockets: new Map(sockets.map((s, i) => [String(i), s])) } as any;
}

function liveSocket(actorType: string, clientId?: number, expertId?: number) {
  return {
    data: { auth: { actorType, clientId, expertId } },
  };
}

describe('consultationDisconnectGraceMs', () => {
  it('defaults to 30s', () => {
    delete process.env.CONSULTATION_DISCONNECT_GRACE_MS;
    delete process.env.CHAT_DISCONNECT_GRACE_MS;
    expect(consultationDisconnectGraceMs()).toBe(30000);
  });
});

describe('hasLiveActorSocket', () => {
  it('matches the same actor on another socket', () => {
    const server = socketServer([liveSocket('client', 10)]);
    expect(hasLiveActorSocket(server, 'client', 10)).toBe(true);
  });

  it('ignores other actors and anonymous sockets', () => {
    const server = socketServer([
      liveSocket('client', 11),
      liveSocket('expert', undefined, 10),
      { data: { auth: null } },
      { data: {} },
    ]);
    expect(hasLiveActorSocket(server, 'client', 10)).toBe(false);
    expect(hasLiveActorSocket(server, 'expert', 10)).toBe(true);
  });

  it('reads the namespace shape (Map at .sockets)', () => {
    const server = namespaceServer([liveSocket('client', 10)]);
    expect(hasLiveActorSocket(server, 'client', 10)).toBe(true);
    expect(hasLiveActorSocket(server, 'client', 11)).toBe(false);
  });

  it('returns false instead of throwing on unknown shapes', () => {
    expect(hasLiveActorSocket({} as any, 'client', 10)).toBe(false);
    expect(
      hasLiveActorSocket({ sockets: undefined } as any, 'client', 10),
    ).toBe(false);
  });
});

describe('consultationDisconnectGrace arm/cancel', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockedClose.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
    consultationDisconnectGrace.cancel('client', 10);
    consultationDisconnectGrace.cancel('expert', 10);
  });

  it('defers the session close past the grace window', () => {
    const db = {} as any;
    const server = socketServer([]);
    consultationDisconnectGrace.arm(db, server, 'client', 10, { clientId: 10 }, 'x');
    expect(mockedClose).not.toHaveBeenCalled();
    vi.advanceTimersByTime(consultationDisconnectGraceMs());
    expect(mockedClose).toHaveBeenCalledWith(db, server, { clientId: 10 }, 'x');
  });

  it('cancel inside the window prevents the close (refresh rejoins)', () => {
    const db = {} as any;
    const server = socketServer([]);
    consultationDisconnectGrace.arm(db, server, 'client', 10, { clientId: 10 }, 'x');
    consultationDisconnectGrace.cancel('client', 10);
    vi.advanceTimersByTime(consultationDisconnectGraceMs() * 2);
    expect(mockedClose).not.toHaveBeenCalled();
  });

  it('re-arm replaces the pending timer', () => {
    const db = {} as any;
    const server = socketServer([]);
    consultationDisconnectGrace.arm(db, server, 'client', 10, { clientId: 10 }, 'x');
    vi.advanceTimersByTime(consultationDisconnectGraceMs() - 1000);
    consultationDisconnectGrace.arm(db, server, 'client', 10, { clientId: 10 }, 'x');
    vi.advanceTimersByTime(consultationDisconnectGraceMs() - 1000);
    expect(mockedClose).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1000);
    expect(mockedClose).toHaveBeenCalledTimes(1);
  });
});
