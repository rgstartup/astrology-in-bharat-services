import {
  Inject,
  Injectable,
} from '@nestjs/common';
import { isUUID } from 'class-validator';
import { and, eq } from 'drizzle-orm';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import { expertAccounts, sessions, users } from '@/core/drizzledb/schema';
import { type IHasher, IHasherToken } from '@/shared/contracts/hasher.contract';
import { RefreshTokenCacheService } from '@/internal/auth/services/refresh-token-cache.service';
import {
  AccountSuspendedError,
  InvalidRefreshTokenError,
  RefreshSessionExpiredOrRevokedError,
  TokenReuseDetectedError,
} from '@/internal/auth/domain/errors/refresh-token.errors';
import { ExpertTokenCryptoService } from '../services/token-crypto.service';

/**
 * Rotates an expert refresh token into a fresh access/refresh pair.
 *
 * Implements strict transactional row locking (FOR UPDATE), token family tracking,
 * 15s grace replay handling via Redis, and family-wide revocation on token reuse.
 */
@Injectable()
export class ExpertRefreshTokenUseCase {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly tokenCrypto: ExpertTokenCryptoService,
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
   * @throws AccountSuspendedError When the expert or the user account is suspended.
   * @throws TokenReuseDetectedError When token reuse outside the grace window is detected.
   */
  async execute(refreshToken: string, ip?: string, userAgent?: string) {
    const [sessionId, raw] = (refreshToken || '').split('.');
    if (!isUUID(sessionId, '7') || !raw) {
      throw new InvalidRefreshTokenError();
    }

    const result = await this.db.transaction(async (tx) => {
      // 1. Lock the session row to serialize concurrent refreshes
      const [session] = await tx
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

      if (!session || session.revoked || new Date() > session.expires_at) {
        return { type: 'revoked_or_expired' as const };
      }

      // Check account suspension status
      const [row] = await tx
        .select({
          expert_id: expertAccounts.id,
          expert_email: expertAccounts.email,
          expert_is_blocked: expertAccounts.is_blocked,
          user_email: users.email,
          user_is_blocked: users.is_blocked,
        })
        .from(expertAccounts)
        .innerJoin(users, eq(users.id, expertAccounts.user_id))
        .where(eq(expertAccounts.user_id, session.user_id))
        .limit(1);

      if (!row || row.expert_is_blocked || row.user_is_blocked) {
        return { type: 'account_suspended' as const };
      }

      // Branch 1: Current valid secret presented -> Rotate
      const isCurrent = await this.hasher.verify(session.secret_hash, raw);
      if (isCurrent) {
        const [accessToken, next] = await Promise.all([
          this.tokenCrypto.createAccessToken({
            sub: row.expert_id,
            email: row.expert_email ?? row.user_email,
          }),
          this.tokenCrypto.createRefreshToken(),
        ]);

        const nextRefreshToken = `${session.id}.${next.raw}`;

        // Keep revoked_at null: session remains active and healthy
        await tx
          .update(sessions)
          .set({
            secret_hash: next.hash,
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            ip_address: ip,
            user_agent: userAgent,
          })
          .where(eq(sessions.id, session.id));

        return {
          type: 'rotated' as const,
          sessionId: session.id,
          tokens: { accessToken, refreshToken: nextRefreshToken },
        };
      }

      // Branch 2: Check Redis rotation cache for grace replay (< 15s)
      const cached = await this.cache.getRotationResult('expert', session.id, raw);
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
        .where(eq(sessions.family_id, session.family_id));

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
        'expert',
        result.sessionId,
        raw,
        result.tokens,
        15,
      );
      return result.tokens;
    }

    return result.tokens;
  }
}
