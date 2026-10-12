import {
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { isUUID } from 'class-validator';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import {
  merchantAccounts,
  sessions,
} from '@/core/drizzledb/schema';
import {
  type IHasher,
  IHasherToken,
} from '../../../../../shared/contracts/hasher.contract';
import { MerchantTokenCryptoService } from '../services/token-crypto.service';

@Injectable()
export class MerchantRefreshTokenUseCase {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly tokenCrypto: MerchantTokenCryptoService,
    @Inject(IHasherToken) private readonly hasher: IHasher,
  ) {}

  async execute(refreshToken: string, ip?: string, userAgent?: string) {
    const [sessionId, raw] = (refreshToken || '').split('.');
    if (!isUUID(sessionId, '7') || !raw) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    const session = await this.db.query.sessions.findFirst({
      where: and(
        eq(sessions.id, sessionId),
        eq(sessions.type, 'refresh_token'),
        eq(sessions.revoked, false),
      ),
      with: { user: true },
    });
    if (!session || session.revoked || session.expires_at < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
    if (!(await this.hasher.verify(session.secret_hash, raw))) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    const merchant = await this.db.query.merchantAccounts.findFirst({
      where: eq(merchantAccounts.user_id, session.user.id),
      with: { user: true },
    });
    if (!merchant || merchant.is_blocked || merchant.user?.is_blocked) {
      throw new ForbiddenException('Your account has been suspended');
    }
    return this.db.transaction(async (tx) => {
      const [accessToken, next] = await Promise.all([
        this.tokenCrypto.createAccessToken({
          sub: merchant.id,
          email: merchant.email ?? session.user.email,
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

