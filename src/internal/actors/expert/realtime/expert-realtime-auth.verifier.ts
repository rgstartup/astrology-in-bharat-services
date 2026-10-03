import { Inject, Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import { expertAccounts, users } from '@/core/drizzledb/schema';
import type { IRealtimeAuthVerifier } from '@/internal/realtime/contracts/realtime-auth-verifier.contract';
import type {
  AuthenticatedSocketIdentity,
  RealtimeActorType,
} from '@/internal/realtime/types/socket-auth.types';
import type { ExpertJwtPayload } from '../auth/strategies/jwt.strategy';

@Injectable()
export class ExpertRealtimeAuthVerifier implements IRealtimeAuthVerifier {
  readonly actorType: RealtimeActorType = 'expert';
  private readonly logger = new Logger(ExpertRealtimeAuthVerifier.name);

  constructor(
    private readonly jwtService: JwtService,
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
  ) {}

  async verify(cleanToken: string): Promise<AuthenticatedSocketIdentity | null> {
    try {
      const payload =
        await this.jwtService.verifyAsync<ExpertJwtPayload>(cleanToken);
      if (!payload || !payload.sub) {
        return null;
      }

      const expertId = Number(payload.sub);
      if (Number.isNaN(expertId)) {
        return null;
      }

      const [expert] = await this.db
        .select({
          id: expertAccounts.id,
          email: expertAccounts.email,
          is_blocked: expertAccounts.is_blocked,
          user_email: users.email,
          user_is_blocked: users.is_blocked,
        })
        .from(expertAccounts)
        .innerJoin(users, eq(users.id, expertAccounts.user_id))
        .where(eq(expertAccounts.id, expertId))
        .limit(1);

      if (!expert || expert.is_blocked || expert.user_is_blocked) {
        return null;
      }

      return {
        actorType: 'expert',
        id: expert.id,
        expertId: expert.id,
        email: expert.email ?? expert.user_email ?? payload.email,
      };
    } catch (err) {
      this.logger.debug(
        `Expert token verification failed: ${(err as Error).message}`,
      );
      return null;
    }
  }
}
