import { ClientAccount } from '../../account/entities/account.entity';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { createJwtStrategyOptions } from '@/modules/auth/strategies/abstract/jwt.options';

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
    @InjectRepository(ClientAccount)
    private readonly clientRepository: Repository<ClientAccount>,
  ) {
    super(createJwtStrategyOptions(config));
  }

  async validate(payload: ClientJwtPayload): Promise<ClientAccount> {
    const client = await this.clientRepository
      .createQueryBuilder('client')
      .leftJoin('client.user', 'user')
      .leftJoinAndSelect('client.avatar_media', 'avatar_media')
      .addSelect('user.id')
      .where('client.id = :id', {
        id: Number(payload.sub),
      })
      .getOne();

    if (!client || client.is_blocked) {
      throw new UnauthorizedException();
    }

    return client;
  }
}
