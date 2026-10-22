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
import {
  clientAccounts,
  sessions,
  users,
} from '@/core/drizzledb/schema';
import { RedisService } from '@/core/redis/redis.service';
import {
  type IHasher,
  IHasherToken,
} from '@/shared/contracts/hasher.contract';
import { IAccessTokenPayloadClient } from '@/shared/types/access-token.payload';
import {
  rememberRotatedSecret,
  verifyRefreshSecret,
} from '@/internal/auth/refresh-token-grace';
import { TokenCryptoService } from '../services/token-crypto.service';

/**
 * Rotates a client refresh token into a fresh access/refresh pair.
 *
 * The stored secret is replaced on every refresh. A secret that is rotated
 * out stays verifiable for the rotation grace window so two in-flight
 * refreshes presenting the same token cannot invalidate each other.
 */
@Injectable()
export class ClientRefreshTokenUseCase {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly tokenCrypto: TokenCryptoService,
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
   * @throws ForbiddenException When the client or the user account is suspended.
   */
  async execute(refreshToken: string, ip?: string, userAgent?: string) {
    const [sessionId, refreshTokenRaw] = (refreshToken || '').split('.');

    if (!isUUID(sessionId, '7') || !refreshTokenRaw) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const [foundSession] = await this.db
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

    if (!foundSession) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (foundSession.revoked || new Date() > foundSession.expires_at) {
      throw new UnauthorizedException('Session expired');
    }

    const secretIsValid = await verifyRefreshSecret(
      this.redis,
      this.hasher,
      foundSession.id,
      foundSession.secret_hash,
      refreshTokenRaw,
    );

    if (!secretIsValid) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const [sessionUser] = await this.db
      .select({ is_blocked: users.is_blocked })
      .from(users)
      .where(eq(users.id, foundSession.user_id))
      .limit(1);

    const [clientAccount] = await this.db
      .select()
      .from(clientAccounts)
      .where(eq(clientAccounts.user_id, foundSession.user_id))
      .limit(1);

    if (!clientAccount || clientAccount.is_blocked || sessionUser?.is_blocked) {
      throw new ForbiddenException('Your account has been suspended');
    }

    // The secret below is about to be replaced. Keep it verifiable for the
    // grace window so a concurrent in-flight refresh with the same token
    // does not 401 and bounce the client out of a live consultation.
    await rememberRotatedSecret(
      this.redis,
      foundSession.id,
      foundSession.secret_hash,
    );

    return this.db.transaction(async (tx) => {
      const [accessToken, newRefreshToken] = await Promise.all([
        this.tokenCrypto.createAccessToken<IAccessTokenPayloadClient>({
          sub: clientAccount.id,
          email: clientAccount.email,
        }),
        this.tokenCrypto.createRefreshToken(),
      ]);

      const SEVEN_DAYS_IN_MS = 7 * 24 * 60 * 60 * 1000;

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
        accessToken,
        refreshToken: `${foundSession.id}.${newRefreshToken.raw}`,
      };
    });
  }
}
