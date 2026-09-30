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
import { type IHasher, IHasherToken } from '@/shared/contracts/hasher.contract';
import { ExpertTokenCryptoService } from '../services/token-crypto.service';

@Injectable()
export class ExpertRefreshTokenUseCase {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly tokenCrypto: ExpertTokenCryptoService,
    @Inject(IHasherToken) private readonly hasher: IHasher,
  ) {}

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
    if (!(await this.hasher.verify(session.secret_hash, raw))) {
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
