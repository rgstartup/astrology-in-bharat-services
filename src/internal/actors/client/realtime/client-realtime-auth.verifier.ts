import { Inject, Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import { clientAccounts } from '@/core/drizzledb/schema';
import type { IRealtimeAuthVerifier } from '@/internal/realtime/contracts/realtime-auth-verifier.contract';
import type {
  AuthenticatedSocketIdentity,
  RealtimeActorType,
} from '@/internal/realtime/types/socket-auth.types';
import type { ClientJwtPayload } from '../auth/strategies/jwt.strategy';

@Injectable()
export class ClientRealtimeAuthVerifier implements IRealtimeAuthVerifier {
  readonly actorType: RealtimeActorType = 'client';
  private readonly logger = new Logger(ClientRealtimeAuthVerifier.name);

  constructor(
    private readonly jwtService: JwtService,
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
  ) {}

  async verify(cleanToken: string): Promise<AuthenticatedSocketIdentity | null> {
    try {
      const payload =
        await this.jwtService.verifyAsync<ClientJwtPayload>(cleanToken);
      if (!payload || !payload.sub) {
        return null;
      }

      const clientId = Number(payload.sub);
      if (Number.isNaN(clientId)) {
        return null;
      }

      const [client] = await this.db
        .select({
          id: clientAccounts.id,
          email: clientAccounts.email,
          is_blocked: clientAccounts.is_blocked,
        })
        .from(clientAccounts)
        .where(eq(clientAccounts.id, clientId))
        .limit(1);

      if (!client || client.is_blocked) {
        return null;
      }

      return {
        actorType: 'client',
        id: client.id,
        clientId: client.id,
        email: client.email ?? payload.email,
      };
    } catch (err) {
      this.logger.debug(
        `Client token verification failed: ${(err as Error).message}`,
      );
      return null;
    }
  }
}
