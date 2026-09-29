import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { eq } from 'drizzle-orm';
import { createJwtStrategyOptions } from '@/internal/auth/strategies/abstract/jwt.options';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import { expertAccounts, users } from '@/core/drizzledb/schema';
import { IExpert } from '@/shared/types/access-token.payload';

export interface ExpertJwtPayload {
  sub: number;
  email: string;
}

@Injectable()
export class ExpertJwtStrategy extends PassportStrategy(
  Strategy,
  'expert-jwt',
) {
  constructor(
    config: ConfigService,
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
  ) {
    super(createJwtStrategyOptions(config));
  }

  async validate(payload: ExpertJwtPayload): Promise<IExpert> {
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
      .where(eq(expertAccounts.id, payload.sub))
      .limit(1);

    if (!expert || expert.is_blocked || expert.user_is_blocked) {
      throw new UnauthorizedException();
    }
    return {
      sub: expert.id,
      email: expert.email ?? expert.user_email,
    };
  }
}
