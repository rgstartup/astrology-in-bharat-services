import { Logger } from '@nestjs/common';
import type { RedisService } from '@/core/redis/redis.service';
import type { IHasher } from '@/shared/contracts/hasher.contract';

/**
 * Rotation grace for refresh tokens.
 *
 * Every refresh rotates the stored secret, so two in-flight refreshes that
 * present the SAME token race: the first one commits the new secret, the
 * second one then fails verification and the caller is logged out even
 * though the session is perfectly valid.
 *
 * The grace window keeps the outgoing secret verifiable for a short time, so
 * the loser of that race still authenticates. Cost: a stolen refresh token
 * stays usable for at most the grace window after it is rotated out.
 */
const DEFAULT_GRACE_SECONDS = 30;
const MAX_GRACE_ENTRIES = 5;

const logger = new Logger('RefreshTokenGrace');

/**
 * Pushes a rotated-out secret onto the grace list, atomically.
 * Keeps the list bounded and refreshes the TTL of the whole list.
 */
const PUSH_SCRIPT = `
local key = KEYS[1]
local secret = ARGV[1]
local ttl = tonumber(ARGV[2])
local maxEntries = tonumber(ARGV[3])
local existing = redis.call('LRANGE', key, 0, -1)
for i = 1, #existing do
  if existing[i] == secret then
    redis.call('EXPIRE', key, ttl)
    return 0
  end
end
redis.call('RPUSH', key, secret)
redis.call('LTRIM', key, -maxEntries, -1)
redis.call('EXPIRE', key, ttl)
return 1
`;

/** How long a rotated-out refresh secret stays verifiable, in seconds. */
export function refreshGraceSeconds(): number {
  const seconds = parseInt(
    process.env.REFRESH_TOKEN_GRACE_SECONDS || `${DEFAULT_GRACE_SECONDS}`,
    10,
  );
  return Number.isFinite(seconds) && seconds > 0 ? seconds : DEFAULT_GRACE_SECONDS;
}

/** Redis key holding the recently rotated secrets of one refresh session. */
export function refreshGraceKey(sessionId: string): string {
  return `auth:refresh:grace:${sessionId}`;
}

/**
 * Verifies a presented refresh secret against the session's current secret
 * or against any secret that was rotated out inside the grace window.
 *
 * Fails closed on the grace part: a Redis outage only disables the grace
 * window, it never accepts a secret that is not the stored one.
 *
 * @param redis - Redis client used to read the grace list.
 * @param hasher - Password hasher able to verify a stored secret hash.
 * @param sessionId - Id of the refresh session the secret belongs to.
 * @param currentHash - Secret hash currently stored for the session.
 * @param raw - Raw secret presented by the caller.
 * @returns True when the secret is the current one or still inside the grace window.
 */
export async function verifyRefreshSecret(
  redis: RedisService,
  hasher: IHasher,
  sessionId: string,
  currentHash: string,
  raw: string,
): Promise<boolean> {
  if (await hasher.verify(currentHash, raw)) return true;
  for (const hash of await readRotatedSecrets(redis, sessionId)) {
    if (await hasher.verify(hash, raw)) return true;
  }
  return false;
}

/**
 * Remembers the secret that is being rotated out so concurrent in-flight
 * refreshes presenting the same token still verify.
 *
 * Best effort: when Redis is unreachable the rotation still happens, only
 * the grace window is lost.
 *
 * @param redis - Redis client used to store the grace list.
 * @param sessionId - Id of the refresh session the secret belongs to.
 * @param secretHash - Secret hash that is about to be replaced.
 */
export async function rememberRotatedSecret(
  redis: RedisService,
  sessionId: string,
  secretHash: string,
): Promise<void> {
  try {
    await redis.eval(
      PUSH_SCRIPT,
      1,
      refreshGraceKey(sessionId),
      secretHash,
      refreshGraceSeconds(),
      MAX_GRACE_ENTRIES,
    );
  } catch (error) {
    logger.warn(
      `Could not remember rotated secret for session ${sessionId}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Reads the recently rotated secrets of one session.
 *
 * @param redis - Redis client used to read the grace list.
 * @param sessionId - Id of the refresh session.
 * @returns Rotated secret hashes, empty when none are remembered.
 */
async function readRotatedSecrets(
  redis: RedisService,
  sessionId: string,
): Promise<string[]> {
  try {
    const secrets = await redis.getClient().lrange(refreshGraceKey(sessionId), 0, -1);
    return secrets.filter((value): value is string => typeof value === 'string');
  } catch (error) {
    logger.warn(
      `Could not read the refresh grace list for session ${sessionId}: ${error instanceof Error ? error.message : String(error)}`,
    );
    return [];
  }
}
