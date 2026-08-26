import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '@/modules/users/infrastructure/entities/user.entity';
import { ClientLoginDto } from '../dto/client-login.dto';
import { IHasher, IHasherToken } from '@/common/contracts/hasher.contract';
import { IAccessTokenPayloadClient } from '@/common/types/access-token.payload';
import { TokenCryptoService } from '../services/token-crypto.service';
import { Session } from '@/modules/auth/infrastructure/entities/session.entity';
import { ClientAccount } from '@/modules/client/account/entities/account.entity';

@Injectable()
export class ClientLoginWithEmailUseCase {
  constructor(
    @InjectRepository(ClientAccount)
    private readonly clientAccountRepo: Repository<ClientAccount>,
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
    private readonly tokenCrypto: TokenCryptoService,
    @Inject(IHasherToken)
    private readonly hasher: IHasher,
  ) {}

  async execute(dto: ClientLoginDto, ip?: string, userAgent?: string) {
    const account = await this.clientAccountRepo
      .createQueryBuilder('client')
      .select([
        'client.id',
        'client.email',
        'client.is_blocked',
        'user.id',
        'user.email',
        'user.password',
        'user.email_verified_at',
        'user.is_blocked',
      ])
      .where('user.email = :email', { email: dto.email })
      .innerJoin('client.user', 'user')
      .getOne();

    const isValidPassword = await this.verifyPassword(
      account?.user ?? null,
      dto.password,
    );

    if (
      !account ||
      !account?.user ||
      !account?.user.password ||
      !isValidPassword
    ) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!account.user.email_verified_at) {
      throw new ConflictException('Please verify your email first');
    }

    if (account.is_blocked || account.user.is_blocked) {
      throw new ForbiddenException('Your account has been suspended');
    }

    const tokens = await this.getTokens(account);

    const session = await this.createSession(
      account.user,
      tokens.refreshToken.hash,
      ip,
      userAgent,
    );

    return {
      accessToken: tokens.accessToken,
      refreshToken: `${session.id}.${tokens.refreshToken.raw}`,
    };
  }

  private async verifyPassword(
    user: User | null,
    password: string,
  ): Promise<boolean> {
    const FALLBACK_PASSWORD = await this.hasher.hash(
      'fallbackInvalidPassword',
    );

    const isValid = await this.hasher.verify(
      user?.password ?? FALLBACK_PASSWORD,
      password,
    );

    return isValid;
  }

  private async getTokens(account: ClientAccount) {
    const [accessToken, refreshToken] = await Promise.all([
      this.tokenCrypto.createAccessToken<IAccessTokenPayloadClient>({
        sub: account.id,
        email: account.email,
      }),
      this.tokenCrypto.createRefreshToken(),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  private async createSession(
    user: User,
    refreshTokenHash: string,
    ip?: string,
    ua?: string,
  ) {
    const newSession = this.sessionRepository.create({
      user,
      ip_address: ip,
      user_agent: ua,
      type: 'refresh_token',
      secret_hash: refreshTokenHash,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    return this.sessionRepository.save(newSession);
  }
}
