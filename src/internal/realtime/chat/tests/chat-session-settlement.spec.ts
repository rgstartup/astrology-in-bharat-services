import { describe, expect, it, vi } from 'vitest';
import { closeActiveChatSessions } from '../chat-session-settlement';

/** Thenable `where()` result that also supports `.returning()`. */
function whereResult(rows: unknown[]) {
  return Object.assign(Promise.resolve(rows), {
    returning: () => Promise.resolve(rows),
  });
}

function dbMock(openRows: unknown[], closedRows: unknown[]) {
  const updates: unknown[] = [];
  return {
    updates,
    select: vi.fn(() => ({
      from: vi.fn(() => ({ where: vi.fn().mockResolvedValue(openRows) })),
    })),
    update: vi.fn(() => ({
      set: vi.fn((values: unknown) => {
        updates.push(values);
        // First update per consultation targets sessions (COMPLETED flip),
        // second stamps the parent consultation's ended_at.
        const rows = updates.length % 2 === 1 ? closedRows : [];
        return { where: vi.fn(() => whereResult(rows)) };
      }),
    })),
  };
}

function serverMock() {
  const emit = vi.fn();
  return { emit, server: { to: vi.fn(() => ({ emit })) } as any };
}

describe('closeActiveChatSessions (disconnect closes live sessions)', () => {
  it('closes ACTIVE sessions, stamps ended_at, emits chat:ended', async () => {
    const db = dbMock([{ id: 7 }], [{ id: 3 }]);
    const { emit, server } = serverMock();

    const closed = await closeActiveChatSessions(
      db as any,
      server,
      { clientId: 10 },
      'client_disconnect',
    );

    expect(closed).toEqual([7]);
    // Session flip to COMPLETED.
    expect(db.updates[0]).toMatchObject({ status: 'completed' });
    expect((db.updates[0] as Record<string, unknown>).ended_at).toBeInstanceOf(
      Date,
    );
    // Parent consultation ended_at stamp (status untouched).
    expect(db.updates[1]).not.toHaveProperty('status');
    expect((db.updates[1] as Record<string, unknown>).ended_at).toBeInstanceOf(
      Date,
    );
    expect(server.to).toHaveBeenCalledWith('chat:7');
    expect(emit).toHaveBeenCalledWith(
      'consultation:chat:ended',
      expect.objectContaining({
        consultationId: 7,
        endedBy: 'client_disconnect',
      }),
    );
  });

  it('is a no-op when no ACTIVE session exists', async () => {
    const db = dbMock([{ id: 7 }], []);
    const { emit, server } = serverMock();

    const closed = await closeActiveChatSessions(
      db as any,
      server,
      { expertId: 42 },
      'expert_disconnect',
    );

    expect(closed).toEqual([]);
    expect(emit).not.toHaveBeenCalled();
  });

  it('does nothing when the actor has no open consultations', async () => {
    const db = dbMock([], []);
    const { emit, server } = serverMock();

    const closed = await closeActiveChatSessions(
      db as any,
      server,
      { clientId: 10 },
      'client_disconnect',
    );

    expect(closed).toEqual([]);
    expect(db.update).not.toHaveBeenCalled();
    expect(emit).not.toHaveBeenCalled();
  });
});
