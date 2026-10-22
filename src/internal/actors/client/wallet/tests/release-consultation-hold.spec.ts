import { describe, expect, it, vi } from 'vitest';
import { releaseConsultationHold } from '../release-consultation-hold';

/** Chainable drizzle mock: each terminal `limit()` pops the next queued rows. */
function dbMock(queuedRows: unknown[][]) {
  const queue = [...queuedRows];
  const limit = vi.fn(async () => queue.shift() ?? []);
  const where = vi.fn(() => ({ limit }));
  const from = vi.fn(() => ({ where }));
  const updates: Record<string, unknown>[] = [];
  const inserted: Record<string, unknown>[] = [];
  return {
    updates,
    inserted,
    select: vi.fn(() => ({ from })),
    update: vi.fn(() => ({
      set: vi.fn((values: Record<string, unknown>) => {
        updates.push(values);
        return { where: vi.fn(() => ({ limit })) };
      }),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(async (values: Record<string, unknown>) => {
        inserted.push(values);
      }),
    })),
  };
}

describe('releaseConsultationHold', () => {
  it('refunds the hold that was taken when the consultation was requested', async () => {
    const db = dbMock([
      [{ amount: '100' }],
      [],
      [{ id: 5, client_id: 10, balance: '50', reserved_balance: '100' }],
    ]);

    const released = await releaseConsultationHold(db as any, 10, 42);

    expect(released).toBe(100);
    expect(db.updates[0]).toMatchObject({
      balance: '150',
      reserved_balance: '0',
    });
    expect(db.inserted[0]).toMatchObject({
      type: 'release',
      purpose: 'refund',
      reference_id: 'consultation_42',
      amount: '100',
    });
  });

  it('never refunds the same hold twice', async () => {
    const db = dbMock([[{ amount: '100' }], [{ id: 9 }]]);

    const released = await releaseConsultationHold(db as any, 10, 42);

    expect(released).toBe(0);
    expect(db.update).not.toHaveBeenCalled();
    expect(db.insert).not.toHaveBeenCalled();
  });

  it('is a no-op when no hold was taken', async () => {
    const db = dbMock([[]]);

    expect(await releaseConsultationHold(db as any, 10, 42)).toBe(0);
    expect(db.update).not.toHaveBeenCalled();
  });

  it('only refunds what is still reserved', async () => {
    const db = dbMock([
      [{ amount: '100' }],
      [],
      [{ id: 5, client_id: 10, balance: '0', reserved_balance: '40' }],
    ]);

    const released = await releaseConsultationHold(db as any, 10, 42);

    expect(released).toBe(40);
    expect(db.updates[0]).toMatchObject({
      balance: '40',
      reserved_balance: '0',
    });
  });
});
