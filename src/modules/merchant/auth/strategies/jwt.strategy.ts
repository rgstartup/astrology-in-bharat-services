import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';
import { createJwtStrategyOptions } from '@/modules/auth/strategies/abstract/jwt.options';
import { MerchantAccount } from '../../account/entities/account.entity';
import { IMerchant } from '@/common/types/access-token.payload';

export interface MerchantJwtPayload {
  sub: string;
  email: string;
}

@Injectable()
export class MerchantJwtStrategy extends PassportStrategy(
  Strategy,
  'merchant-jwt',
) {
  constructor(
    config: ConfigService,
    @InjectRepository(MerchantAccount)
    private readonly merchantRepository: Repository<MerchantAccount>,
  ) {
    super(createJwtStrategyOptions(config));
  }

  async validate(payload: MerchantJwtPayload): Promise<IMerchant> {
    const merchant = await this.merchantRepository.findOne({
      where: { id: payload.sub },
      relations: { user: true },
    });
    if (!merchant || merchant.is_blocked || merchant.user.is_blocked) {
      throw new UnauthorizedException();
    }
    return {
      sub: merchant.id,
      email: merchant.email ?? merchant.user.email,
    };
  }
}
