import {
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { isUUID } from 'class-validator';
import { and, eq } from 'drizzle-orm';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import { expertAccounts, sessions, users } from '@/core/drizzledb/schema';
import { RedisService } from '@/core/redis/redis.service';
import { type IHasher, IHasherToken } from '@/shared/contracts/hasher.contract';
import {
  rememberRotatedSecret,
  verifyRefreshSecret,
} from '@/internal/auth/refresh-token-grace';
import { ExpertTokenCryptoService } from '../services/token-crypto.service';

/**
 * Rotates an expert refresh token into a fresh access/refresh pair.
 *
 * The stored secret is replaced on every refresh. A secret that is rotated
 * out stays verifiable for the rotation grace window so two in-flight
 * refreshes presenting the same token cannot invalidate each other.
 */
@Injectable()
export class ExpertRefreshTokenUseCase {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly tokenCrypto: ExpertTokenCryptoService,
    @Inject(IHasherToken) private readonly hasher: IHasher,
    private readonly redis: RedisService,
  ) {}

  /**
   * Issues a new access token and a new refresh token for the given session.
   *
   * @param refreshToken - Raw refresh token in `<sessionId>.<secret>` form.
   * @param ip - Optional client IP stored on the session row.
   * @param userAgent - Optional client user agent stored on the session row.
   * @returns Fresh access and refresh tokens.
   * @throws UnauthorizedException When the token is malformed, unknown, expired or not verifiable.
   * @throws ForbiddenException When the expert or the user account is suspended.
   */
  async execute(refreshToken: string, ip?: string, userAgent?: string) {
    const [sessionId, raw] = (refreshToken || '').split('.');
    if (!isUUID(sessionId, '7') || !raw) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    const [session] = await this.db
      .select({
        id: sessions.id,
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
          eq(sessions.revoked, false),
        ),
      )
      .limit(1);

    if (!session || session.revoked || new Date() > session.expires_at) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
    const secretIsValid = await verifyRefreshSecret(
      this.redis,
      this.hasher,
      session.id,
      session.secret_hash,
      raw,
    );
    if (!secretIsValid) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    const [row] = await this.db
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
      throw new ForbiddenException('Your account has been suspended');
    }

    // The secret below is about to be replaced. Keep it verifiable for the
    // grace window so a concurrent in-flight refresh with the same token
    // does not 401 and bounce the expert out of a live consultation.
    await rememberRotatedSecret(this.redis, session.id, session.secret_hash);

    return this.db.transaction(async (tx) => {
      const [accessToken, next] = await Promise.all([
        this.tokenCrypto.createAccessToken({
          sub: row.expert_id,
          email: row.expert_email ?? row.user_email,
        }),
        this.tokenCrypto.createRefreshToken(),
      ]);
      await tx
        .update(sessions)
        .set({
          secret_hash: next.hash,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          ip_address: ip,
          user_agent: userAgent,
        })
        .where(eq(sessions.id, session.id));

      return { accessToken, refreshToken: `${session.id}.${next.raw}` };
    });
  }
}
