import {
  Injectable,
  Inject,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DatabaseService } from '@/core/database/database.service';
import { Session } from '@/modules/auth/infrastructure/entities/session.entity';
import { ClientAccount } from '@/modules/client/account/entities/account.entity';
import { TokenCryptoService } from '../services/token-crypto.service';
import { IHasher, IHasherToken } from '@/common/contracts/hasher.contract';
import { IAccessTokenPayloadClient } from '@/common/types/access-token.payload';

@Injectable()
export class ClientRefreshTokenUseCase {
  constructor(
    private readonly db: DatabaseService,
    @InjectRepository(ClientAccount)
    private readonly clientAccountRepo: Repository<ClientAccount>,
    @InjectRepository(Session)
    private readonly sessionRepo: Repository<Session>,
    private readonly tokenCrypto: TokenCryptoService,
    @Inject(IHasherToken)
    private readonly hasher: IHasher,
  ) {}

  async execute(refreshToken: string, ip?: string, userAgent?: string) {
    const [sessionId, refreshTokenRaw] = (refreshToken || '').split('.');

    if (!sessionId || !refreshTokenRaw) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const foundSession = await this.sessionRepo.findOne({
      where: {
        id: sessionId,
        type: 'refresh_token',
        revoked: false,
      },
      relations: {
        user: true,
      },
    });

    if (!foundSession) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (!foundSession.isActive()) {
      throw new UnauthorizedException('Session expired');
    }

    const isValid = await this.hasher.verify(
      foundSession.secret_hash,
      refreshTokenRaw,
    );

    if (!isValid) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const clientAccount = await this.clientAccountRepo.findOne({
      where: { user: { id: foundSession.user.id } },
      relations: ['user'],
    });

    if (
      !clientAccount ||
      clientAccount.is_blocked ||
      foundSession.user.is_blocked
    ) {
      throw new ForbiddenException('Your account has been suspended');
    }

    return this.db.transaction(async (queryRunner) => {
      // 1. Revoke previous session
      await queryRunner.manager.update(
        Session,
        { id: foundSession.id },
        { revoked: true },
      );

      // 2. Generate new tokens
      const [accessToken, newRefreshToken] = await Promise.all([
        this.tokenCrypto.createAccessToken<IAccessTokenPayloadClient>({
          sub: clientAccount.id,
          email: clientAccount.email,
        }),
        this.tokenCrypto.createRefreshToken(),
      ]);

      // 3. Create new session (7-day expiration)
      const SEVEN_DAYS_IN_MS = 7 * 24 * 60 * 60 * 1000;
      const newSession = queryRunner.manager.create(Session, {
        user: foundSession.user,
        ip_address: ip,
        user_agent: userAgent,
        type: 'refresh_token',
        secret_hash: newRefreshToken.hash,
        expires_at: new Date(Date.now() + SEVEN_DAYS_IN_MS),
      });

      await queryRunner.manager.save(Session, newSession);

      return {
        accessToken,
        refreshToken: `${newSession.id}.${newRefreshToken.raw}`,
      };
    });
  }
}
