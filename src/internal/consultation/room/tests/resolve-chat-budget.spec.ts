import { describe, expect, it } from 'vitest';
import { effectiveMaxMinutes } from '../resolve-consultation-budget.use-case';

describe('effectiveMaxMinutes', () => {
  it('keeps the pre-hold snapshot when the balance dropped by the hold', () => {
    // 600 balance, 25/min → 24 min snapshot; 125 held leaves 475.
    expect(
      effectiveMaxMinutes({ maxMinutes: 24, balanceAtSnap: 475, freeBasis: 0 }, 475, 25),
    ).toBe(24);
  });

  it('extends the budget without cap after a recharge', () => {
    expect(
      effectiveMaxMinutes({ maxMinutes: 24, balanceAtSnap: 475, freeBasis: 0 }, 975, 25),
    ).toBe(44);
  });

  it('shrinks the budget after an external spend', () => {
    expect(
      effectiveMaxMinutes({ maxMinutes: 24, balanceAtSnap: 475, freeBasis: 0 }, 375, 25),
    ).toBe(20);
  });

  it('adds wallet-priced minutes on top of the free grant', () => {
    // Free grant is fixed (5); live wallet buys rate-priced minutes on top.
    expect(
      effectiveMaxMinutes({ maxMinutes: 5, balanceAtSnap: 600, freeBasis: 1 }, 1100, 25),
    ).toBe(49);
  });
});
