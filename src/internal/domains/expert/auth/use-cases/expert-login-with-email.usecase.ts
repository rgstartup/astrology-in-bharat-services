import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import { expertAccounts, sessions, users } from '@/core/drizzledb/schema';
import { PlatformEnum } from '@/core/enums';
import { IHasher, IHasherToken } from '@/shared/contracts/hasher.contract';
import { ExpertLoginDto } from '../dto/expert-login.dto';
import { ExpertTokenCryptoService } from '../services/token-crypto.service';

@Injectable()
export class ExpertLoginWithEmailUseCase {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly tokenCrypto: ExpertTokenCryptoService,
    @Inject(IHasherToken) private readonly hasher: IHasher,
  ) {}

  async execute(dto: ExpertLoginDto, ip?: string, userAgent?: string) {
    const [row] = await this.db
      .select({
        expert_id: expertAccounts.id,
        expert_email: expertAccounts.email,
        expert_is_blocked: expertAccounts.is_blocked,
        user_id: users.id,
        user_email: users.email,
        user_password: users.password,
        user_email_verified_at: users.email_verified_at,
        user_is_blocked: users.is_blocked,
      })
      .from(expertAccounts)
      .innerJoin(users, eq(users.id, expertAccounts.user_id))
      .where(
        and(
          eq(users.email, dto.email),
          eq(users.platform, PlatformEnum.EXPERT),
        ),
      )
      .limit(1);

    const fallback = await this.hasher.hash('fallbackInvalidPassword');
    const valid = await this.hasher.verify(
      row?.user_password ?? fallback,
      dto.password,
    );
    if (!row?.user_password || !valid) {
      throw new UnauthorizedException('Invalid email or password');
    }
    if (!row.user_email_verified_at) {
      throw new ConflictException('Please verify your email first');
    }
    if (row.expert_is_blocked || row.user_is_blocked) {
      throw new ForbiddenException('Your account has been suspended');
    }
    return this.issueSession(
      row.expert_id,
      row.expert_email ?? row.user_email,
      row.user_id,
      ip,
      userAgent,
    );
  }

  private async issueSession(
    expertId: number,
    expertEmail: string,
    userId: number,
    ip?: string,
    userAgent?: string,
  ) {
    const [accessToken, refresh] = await Promise.all([
      this.tokenCrypto.createAccessToken({
        sub: expertId,
        email: expertEmail,
      }),
      this.tokenCrypto.createRefreshToken(),
    ]);
    const [session] = await this.db
      .insert(sessions)
      .values({
        user_id: userId,
        ip_address: ip,
        user_agent: userAgent,
        type: 'refresh_token',
        secret_hash: refresh.hash,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      })
      .returning({ id: sessions.id });

    return { accessToken, refreshToken: `${session.id}.${refresh.raw}` };
  }
}
