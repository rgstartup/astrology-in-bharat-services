import { describe, expect, it, vi } from 'vitest';
import {
  refreshGraceKey,
  verifyRefreshSecret,
} from '../refresh-token-grace';

/** Deterministic stand-in for Argon2: the hash of a raw secret is `hash:<raw>`. */
const hasher = {
  hash: async (raw: string) => `hash:${raw}`,
  verify: async (hash: string, raw: string) => hash === `hash:${raw}`,
};

/** Redis stand-in: an in-memory list behind the grace key. */
function redisMock(list: string[] = []) {
  const state = { list };
  const redis = {
    eval: vi.fn(async () => {
      state.list.push('hash:rotated');
      return 1;
    }),
    getClient: vi.fn(() => ({
      lrange: vi.fn(async () => state.list),
    })),
  };
  return { redis, state };
}

describe('refresh token rotation grace', () => {
  it('accepts the secret currently stored for the session', async () => {
    const { redis } = redisMock();

    const ok = await verifyRefreshSecret(
      redis as never,
      hasher,
      'session-1',
      'hash:current',
      'current',
    );

    expect(ok).toBe(true);
  });

  it('accepts a secret that was rotated out inside the grace window', async () => {
    const { redis } = redisMock(['hash:previous']);

    const ok = await verifyRefreshSecret(
      redis as never,
      hasher,
      'session-1',
      'hash:current',
      'previous',
    );

    expect(ok).toBe(true);
  });

  it('rejects a secret that was never stored', async () => {
    const { redis } = redisMock(['hash:previous']);

    const ok = await verifyRefreshSecret(
      redis as never,
      hasher,
      'session-1',
      'hash:current',
      'stolen',
    );

    expect(ok).toBe(false);
  });

  it('fails closed when the grace list cannot be read', async () => {
    const redis = {
      eval: vi.fn(),
      getClient: vi.fn(() => ({
        lrange: vi.fn(async () => {
          throw new Error('redis down');
        }),
      })),
    };

    const ok = await verifyRefreshSecret(
      redis as never,
      hasher,
      'session-1',
      'hash:current',
      'previous',
    );

    expect(ok).toBe(false);
  });

  it('keys the grace list per refresh session', () => {
    expect(refreshGraceKey('session-1')).toBe('auth:refresh:grace:session-1');
  });
});
