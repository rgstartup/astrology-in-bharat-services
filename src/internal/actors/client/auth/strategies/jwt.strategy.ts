import { ClientAccount } from '../../account/entities/account.entity';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import {
  clientAccounts
} from '@/core/drizzledb/schema';
import {createJwtStrategyOptions} from '@/internal/auth/strategies/abstract/jwt.options';

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

  async validate(payload: ClientJwtPayload): Promise<Pick<ClientAccount, 'id' | 'email' | 'is_blocked'>> {
    const [account] = await this.db
      .select({
        id: clientAccounts.id,
        email: clientAccounts.email,
        is_blocked: clientAccounts.is_blocked,
      })
      .from(clientAccounts)
      .where(eq(clientAccounts.id, Number(payload.sub)))
      .limit(1);

    if (!account || account.is_blocked) {
      throw new UnauthorizedException();
    }

    return account;

  }
}
