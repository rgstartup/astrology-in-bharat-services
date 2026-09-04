import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';
import { createJwtStrategyOptions } from '@/modules/auth/api/strategies/abstract/jwt.options';
import { ExpertAccount } from '../../account/entities/account.entity';
import { IUser } from '@/common/types/access-token.payload';
import { RoleEnum } from '@/modules/users/infrastructure/enums/Role.enum';

export interface ExpertJwtPayload {
  sub: string;
  email: string;
}

@Injectable()
export class ExpertJwtStrategy extends PassportStrategy(
  Strategy,
  'expert-jwt',
) {
  constructor(
    config: ConfigService,
    @InjectRepository(ExpertAccount)
    private readonly expertRepository: Repository<ExpertAccount>,
  ) {
    super(createJwtStrategyOptions(config));
  }

  async validate(payload: ExpertJwtPayload): Promise<IUser> {
    const expert = await this.expertRepository.findOne({
      where: { id: payload.sub },
      relations: { user: true },
    });
    if (!expert || expert.is_blocked || expert.user.is_blocked) {
      throw new UnauthorizedException();
    }
    return {
      id: expert.user.id,
      email: expert.user.email,
      role: RoleEnum.EXPERT,
    };
  }
}
