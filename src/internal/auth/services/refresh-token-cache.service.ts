import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { RedisService } from '@/core/redis/redis.service';

/**
 * Token pair payload cached for idempotency across concurrent refreshes.
 */
export interface CachedRotationTokens {
  accessToken: string;
  refreshToken: string;
}

/**
 * Key prefix for rotation idempotency cache entries in Redis.
 */
export const REFRESH_ROTATION_KEY_PREFIX = 'auth:refresh:rotation';

/**
 * Default grace TTL in seconds for rotation cache entries (15s).
 */
export const DEFAULT_ROTATION_TTL_SECONDS = 15;

/**
 * Service managing plaintext JSON, per-rotation idempotency cache in Redis.
 *
 * When a refresh token T_in is rotated to T_out, this service records the result
 * keyed by actor, sessionId, and sha256(rawInputToken). Concurrent requests
 * presenting the exact same raw input token during the 15s grace window retrieve
 * the exact same token pair without re-rotating database credentials.
 */
@Injectable()
export class RefreshTokenCacheService {
  private readonly logger = new Logger(RefreshTokenCacheService.name);
  private readonly defaultTtl: number;

  /**
   * Initializes TTL from config/env or defaults to 15s.
   */
  constructor(
    private readonly redis: RedisService,
    _configService: ConfigService,
  ) {
    const envGrace = parseInt(process.env.REFRESH_TOKEN_GRACE_SECONDS || '', 10);
    this.defaultTtl =
      Number.isFinite(envGrace) && envGrace > 0
        ? envGrace
        : DEFAULT_ROTATION_TTL_SECONDS;
  }

  /**
   * Computes the deterministic Redis key for a given actor, session, and input secret.
   *
   * @param actor - Actor namespace ('expert' | 'client').
   * @param sessionId - Session UUID.
   * @param rawInput - Raw input secret from the refresh token.
   * @returns Formatted Redis key string.
   */
  getCacheKey(
    actor: 'expert' | 'client',
    sessionId: string,
    rawInput: string,
  ): string {
    const inputHash = createHash('sha256').update(rawInput).digest('hex');
    return `${REFRESH_ROTATION_KEY_PREFIX}:${actor}:${sessionId}:${inputHash}`;
  }

  /**
   * Retrieves the cached token pair for a previously rotated input token.
   *
   * @param actor - Actor namespace ('expert' | 'client').
   * @param sessionId - Session UUID.
   * @param rawInput - Raw input secret presented by caller.
   * @returns Token pair, or null if missing or expired.
   */
  async getRotationResult(
    actor: 'expert' | 'client',
    sessionId: string,
    rawInput: string,
  ): Promise<CachedRotationTokens | null> {
    try {
      const key = this.getCacheKey(actor, sessionId, rawInput);
      const raw = await this.redis.getClient().get(key);
      if (!raw) return null;

      return JSON.parse(raw) as CachedRotationTokens;
    } catch (error) {
      this.logger.warn(
        `Failed to retrieve rotation result for session ${sessionId}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }

  /**
   * Stores the resulting token pair as plaintext JSON in Redis with 15s grace TTL.
   *
   * @param actor - Actor namespace ('expert' | 'client').
   * @param sessionId - Session UUID.
   * @param rawInput - Raw input secret presented by caller.
   * @param tokens - Fresh access and refresh tokens to be returned.
   * @param ttlSeconds - Optional TTL override in seconds (default 15s).
   */
  async saveRotationResult(
    actor: 'expert' | 'client',
    sessionId: string,
    rawInput: string,
    tokens: CachedRotationTokens,
    ttlSeconds: number = this.defaultTtl,
  ): Promise<void> {
    try {
      const key = this.getCacheKey(actor, sessionId, rawInput);
      await this.redis.getClient().set(
        key,
        JSON.stringify(tokens),
        'EX',
        ttlSeconds,
      );
    } catch (error) {
      this.logger.warn(
        `Failed to store rotation result for session ${sessionId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
