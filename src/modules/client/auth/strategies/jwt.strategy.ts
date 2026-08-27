import { ClientAccount } from '../../account/entities/account.entity';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { createJwtStrategyOptions } from '@/modules/auth/api/strategies/abstract/jwt.options';

export interface ClientJwtPayload {
  sub: string;
  email: string;
}

@Injectable()
export class ClientJwtStrategy extends PassportStrategy(
  Strategy,
  'client-jwt',
) {
  constructor(
    config: ConfigService,
    @InjectRepository(ClientAccount)
    private readonly clientRepository: Repository<ClientAccount>,
  ) {
    super(createJwtStrategyOptions(config));
  }

  async validate(payload: ClientJwtPayload): Promise<ClientAccount> {
    const client = await this.clientRepository.findOne({
      where: {
        id: payload.sub,
      },
    });

    if (!client || client.is_blocked) {
      throw new UnauthorizedException();
    }

    return client;
  }
}
