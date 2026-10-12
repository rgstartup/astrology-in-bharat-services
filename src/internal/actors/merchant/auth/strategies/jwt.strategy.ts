import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import { merchantAccounts } from '@/core/drizzledb/schema';
import { createJwtStrategyOptions } from '@/internal/auth/strategies/abstract/jwt.options';
import type { IMerchant } from '@/shared/types/access-token.payload';

export interface MerchantJwtPayload {
  sub: number;
  email: string;
}

@Injectable()
export class MerchantJwtStrategy extends PassportStrategy(
  Strategy,
  'merchant-jwt',
) {
  constructor(
    config: ConfigService,
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
  ) {
    super(createJwtStrategyOptions(config));
  }

  async validate(payload: MerchantJwtPayload): Promise<IMerchant> {
    const merchant = await this.db.query.merchantAccounts.findFirst({
      where: eq(merchantAccounts.id, payload.sub),
      with: { user: true },
    });
    if (!merchant || merchant.is_blocked || merchant.user?.is_blocked) {
      throw new UnauthorizedException();
    }
    return {
      sub: merchant.id,
      email: merchant.email ?? merchant.user?.email ?? payload.email,
    };
  }
}
