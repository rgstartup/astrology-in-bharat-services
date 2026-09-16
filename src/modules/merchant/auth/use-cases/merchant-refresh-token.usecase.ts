import {
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DatabaseService } from '@/core/database/database.service';
import { IHasher, IHasherToken } from '@/common/contracts/hasher.contract';
import { Session } from '@/modules/auth/entities/session.entity';
import { MerchantAccount } from '../../account/entities/account.entity';
import { MerchantTokenCryptoService } from '../services/token-crypto.service';

@Injectable()
export class MerchantRefreshTokenUseCase {
  constructor(
    private readonly db: DatabaseService,
    @InjectRepository(MerchantAccount)
    private readonly merchants: Repository<MerchantAccount>,
    @InjectRepository(Session) private readonly sessions: Repository<Session>,
    private readonly tokenCrypto: MerchantTokenCryptoService,
    @Inject(IHasherToken) private readonly hasher: IHasher,
  ) {}

  async execute(refreshToken: string, ip?: string, userAgent?: string) {
    const [sessionId, raw] = (refreshToken || '').split('.');
    if (!sessionId || !raw || isNaN(Number(sessionId))) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    const session = await this.sessions.findOne({
      where: { id: Number(sessionId), type: 'refresh_token', revoked: false },
      relations: { user: true },
    });
    if (!session || !session.isActive()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
    if (!(await this.hasher.verify(session.secret_hash, raw))) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    const merchant = await this.merchants.findOne({
      where: { user: { id: session.user.id } },
      relations: { user: true },
    });
    if (!merchant || merchant.is_blocked || merchant.user.is_blocked) {
      throw new ForbiddenException('Your account has been suspended');
    }
    return this.db.transaction(async (qr) => {
      const [accessToken, next] = await Promise.all([
        this.tokenCrypto.createAccessToken({
          sub: merchant.id,
          email: merchant.email ?? session.user.email,
        }),
        this.tokenCrypto.createRefreshToken(),
      ]);
      await qr.manager.update(
        Session,
        { id: session.id },
        {
          secret_hash: next.hash,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          ip_address: ip,
          user_agent: userAgent,
        },
      );
      return { accessToken, refreshToken: `${session.id}.${next.raw}` };
    });
  }
}
