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
  const selectable = Object.assign(Promise.resolve(openRows), {
    limit: () => Promise.resolve(openRows),
  });
  return {
    updates,
    select: vi.fn(() => ({
      from: vi.fn(() => ({ where: vi.fn(() => selectable) })),
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

/**
 * Drizzle mock for the never-started settle path: queued selects, a
 * transaction, and an ACTIVE-session flip that finds no row.
 */
function neverStartedDbMock(selects: unknown[][]) {
  const queue = [...selects];
  const updates: Record<string, unknown>[] = [];
  const inserted: Record<string, unknown>[] = [];
  const select = vi.fn(() => {
    const rows = queue.shift() ?? [];
    const result = Object.assign(Promise.resolve(rows), {
      limit: () => Promise.resolve(rows),
    });
    return { from: vi.fn(() => ({ where: vi.fn(() => result) })) };
  });
  const tx = {
    select,
    update: vi.fn(() => ({
      set: vi.fn((values: Record<string, unknown>) => {
        updates.push(values);
        return { where: vi.fn(() => Promise.resolve([])) };
      }),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(async (values: Record<string, unknown>) => {
        inserted.push(values);
      }),
    })),
  };
  const db = {
    select,
    // The ACTIVE session flip finds no row -> the settle falls through to
    // the never-started path.
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({ returning: vi.fn(async () => []) })),
      })),
    })),
    transaction: vi.fn(async (cb: (t: typeof tx) => unknown) => cb(tx)),
  };
  return { db, updates, inserted };
}

describe('closeActiveChatSessions (disconnect closes live sessions)', () => {
  it('closes ACTIVE sessions, stamps ended_at, emits consultation:ended', async () => {
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
    expect(server.to).toHaveBeenCalledWith('consultation:7');
    expect(emit).toHaveBeenCalledWith(
      'consultation:ended',
      expect.objectContaining({
        consultationId: 7,
        endedBy: 'client_disconnect',
      }),
    );
  });

  it('is a no-op when no ACTIVE session exists', async () => {
    const { db } = neverStartedDbMock([
      [{ id: 7 }],
      [{ mode: 'AUDIO_CALL', client_id: 10, started_at: null }],
      [],
    ]);
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

describe('closeActiveChatSessions (consultation that never started)', () => {
  it('cancels the consultation and refunds the hold', async () => {
    const { db, updates, inserted } = neverStartedDbMock([
      [{ id: 7 }],
      [{ mode: 'AUDIO_CALL', client_id: 10, started_at: null }],
      [{ id: 3 }],
      [{ amount: '100' }],
      [],
      [{ id: 5, client_id: 10, balance: '50', reserved_balance: '100' }],
    ]);
    const { emit, server } = serverMock();

    const closed = await closeActiveChatSessions(
      db as any,
      server,
      { expertId: 42 },
      'expert_disconnect',
    );

    expect(closed).toEqual([7]);
    // Pending session and the consultation itself are cancelled.
    expect(updates[0]).toMatchObject({ status: 'cancelled' });
    expect(updates[1]).toMatchObject({ status: 'cancelled' });
    // The hold taken at request time is refunded.
    expect(inserted[0]).toMatchObject({
      type: 'release',
      purpose: 'refund',
      reference_id: 'consultation_7',
    });
    expect(emit).toHaveBeenCalledWith(
      'consultation:ended',
      expect.objectContaining({
        consultationId: 7,
        reason: 'never_started',
      }),
    );
  });

  it('leaves a consultation that already started untouched', async () => {
    const { db, updates, inserted } = neverStartedDbMock([
      [{ id: 7 }],
      [{ mode: 'AUDIO_CALL', client_id: 10, started_at: new Date() }],
      [{ id: 3 }],
    ]);
    const { emit, server } = serverMock();

    const closed = await closeActiveChatSessions(
      db as any,
      server,
      { expertId: 42 },
      'expert_disconnect',
    );

    expect(closed).toEqual([]);
    expect(updates).toEqual([]);
    expect(inserted).toEqual([]);
    expect(emit).not.toHaveBeenCalled();
  });
});
