import { ClientAccount } from '../../account/entities/account.entity';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import { clientAccounts, media, users } from '@/core/drizzledb/schema';
import { toClientAccountResponse } from '../../account/account.mapper';
import { createJwtStrategyOptions } from '@/internal/auth/strategies/abstract/jwt.options';

export interface ClientJwtPayload {
  sub: number | string;
  email: string;
}

@Injectable()
export class ClientJwtStrategy extends PassportStrategy(
  Strategy,
  'client-jwt',
) {
  constructor(
    config: ConfigService,
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
  ) {
    super(createJwtStrategyOptions(config));
  }

  async validate(payload: ClientJwtPayload): Promise<ClientAccount> {
    const [account] = await this.db
      .select()
      .from(clientAccounts)
      .where(eq(clientAccounts.id, Number(payload.sub)))
      .limit(1);

    if (!account || account.is_blocked) {
      throw new UnauthorizedException();
    }

    // Mirrors the legacy query: account columns + only `user.id` +
    // the `avatar_media` relation. No addresses (never loaded here).
    const [[user], [avatar_media]] = await Promise.all([
      this.db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, account.user_id))
        .limit(1),
      account.avatar_id
        ? this.db
            .select()
            .from(media)
            .where(eq(media.id, account.avatar_id))
            .limit(1)
            .then(([row]) => [row ?? null])
        : Promise.resolve([null]),
    ]);

    // Boundary cast: the legacy `ClientAccount` entity type is kept until
    // downstream `req.user` consumers migrate to Drizzle row types.
    // Runtime shape matches the old TypeORM result key-for-key.
    return {
      ...toClientAccountResponse(account),
      user: user ?? null,
      avatar_media: avatar_media ?? null,
    } as unknown as ClientAccount;
  }
}
