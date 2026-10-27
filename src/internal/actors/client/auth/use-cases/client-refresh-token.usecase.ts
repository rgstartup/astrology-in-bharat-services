import {
  Inject,
  Injectable,
} from '@nestjs/common';
import { isUUID } from 'class-validator';
import { and, eq } from 'drizzle-orm';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import {
  clientAccounts,
  sessions,
  users,
} from '@/core/drizzledb/schema';
import {
  type IHasher,
  IHasherToken,
} from '@/shared/contracts/hasher.contract';
import { IAccessTokenPayloadClient } from '@/shared/types/access-token.payload';
import { RefreshTokenCacheService } from '@/internal/auth/services/refresh-token-cache.service';
import {
  AccountSuspendedError,
  InvalidRefreshTokenError,
  RefreshSessionExpiredOrRevokedError,
  TokenReuseDetectedError,
} from '@/internal/auth/domain/errors/refresh-token.errors';
import { TokenCryptoService } from '../services/token-crypto.service';

/**
 * Rotates a client refresh token into a fresh access/refresh pair.
 *
 * Implements strict transactional row locking (FOR UPDATE), token family tracking,
 * 15s grace replay handling via Redis, and family-wide revocation on token reuse.
 */
@Injectable()
export class ClientRefreshTokenUseCase {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly tokenCrypto: TokenCryptoService,
    @Inject(IHasherToken) private readonly hasher: IHasher,
    private readonly cache: RefreshTokenCacheService,
  ) {}

  /**
   * Issues a new access token and a new refresh token for the given session.
   *
   * @param refreshToken - Raw refresh token in `<sessionId>.<secret>` form.
   * @param ip - Optional client IP stored on the session row.
   * @param userAgent - Optional client user agent stored on the session row.
   * @returns Fresh access and refresh tokens.
   * @throws InvalidRefreshTokenError When the token is malformed.
   * @throws RefreshSessionExpiredOrRevokedError When the session is revoked or expired.
   * @throws AccountSuspendedError When the client or the user account is suspended.
   * @throws TokenReuseDetectedError When token reuse outside the grace window is detected.
   */
  async execute(refreshToken: string, ip?: string, userAgent?: string) {
    const [sessionId, refreshTokenRaw] = (refreshToken || '').split('.');

    if (!isUUID(sessionId, '7') || !refreshTokenRaw) {
      throw new InvalidRefreshTokenError();
    }

    const result = await this.db.transaction(async (tx) => {
      // 1. Lock session row to serialize concurrent refreshes
      const [foundSession] = await tx
        .select({
          id: sessions.id,
          family_id: sessions.family_id,
          secret_hash: sessions.secret_hash,
          expires_at: sessions.expires_at,
          revoked: sessions.revoked,
          user_id: sessions.user_id,
        })
        .from(sessions)
        .where(
          and(
            eq(sessions.id, sessionId),
            eq(sessions.type, 'refresh_token'),
          ),
        )
        .for('update')
        .limit(1);

      if (
        !foundSession ||
        foundSession.revoked ||
        new Date() > foundSession.expires_at
      ) {
        return { type: 'revoked_or_expired' as const };
      }

      const [sessionUser] = await tx
        .select({ is_blocked: users.is_blocked })
        .from(users)
        .where(eq(users.id, foundSession.user_id))
        .limit(1);

      const [clientAccount] = await tx
        .select()
        .from(clientAccounts)
        .where(eq(clientAccounts.user_id, foundSession.user_id))
        .limit(1);

      if (!clientAccount || clientAccount.is_blocked || sessionUser?.is_blocked) {
        return { type: 'account_suspended' as const };
      }

      // Branch 1: Current valid secret presented -> Rotate
      const isCurrent = await this.hasher.verify(
        foundSession.secret_hash,
        refreshTokenRaw,
      );

      if (isCurrent) {
        const [accessToken, newRefreshToken] = await Promise.all([
          this.tokenCrypto.createAccessToken<IAccessTokenPayloadClient>({
            sub: clientAccount.id,
            email: clientAccount.email,
          }),
          this.tokenCrypto.createRefreshToken(),
        ]);

        const SEVEN_DAYS_IN_MS = 7 * 24 * 60 * 60 * 1000;
        const nextRefreshToken = `${foundSession.id}.${newRefreshToken.raw}`;

        // Keep revoked_at null: session remains active and healthy
        await tx
          .update(sessions)
          .set({
            secret_hash: newRefreshToken.hash,
            expires_at: new Date(Date.now() + SEVEN_DAYS_IN_MS),
            ip_address: ip,
            user_agent: userAgent,
          })
          .where(eq(sessions.id, foundSession.id));

        return {
          type: 'rotated' as const,
          sessionId: foundSession.id,
          tokens: {
            accessToken,
            refreshToken: nextRefreshToken,
          },
        };
      }

      // Branch 2: Check Redis rotation cache for grace replay (< 15s)
      const cached = await this.cache.getRotationResult(
        'client',
        foundSession.id,
        refreshTokenRaw,
      );

      if (cached) {
        return {
          type: 'cached' as const,
          tokens: cached,
        };
      }

      // Branch 3: Theft / Replay detected (> 15s or counterfeit)
      // Commit revocation for the entire token family cleanly without throwing inside tx
      await tx
        .update(sessions)
        .set({
          revoked: true,
          revoked_at: new Date(),
        })
        .where(eq(sessions.family_id, foundSession.family_id));

      return { type: 'theft_detected' as const };
    });

    // Post-commit handling:
    if (result.type === 'revoked_or_expired') {
      throw new RefreshSessionExpiredOrRevokedError();
    }
    if (result.type === 'account_suspended') {
      throw new AccountSuspendedError();
    }
    if (result.type === 'theft_detected') {
      throw new TokenReuseDetectedError();
    }
    if (result.type === 'rotated') {
      // Save rotation result in Redis post-commit with 15s TTL
      await this.cache.saveRotationResult(
        'client',
        result.sessionId,
        refreshTokenRaw,
        result.tokens,
        15,
      );
      return result.tokens;
    }

    return result.tokens;
  }
}
