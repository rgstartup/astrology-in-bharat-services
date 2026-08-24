import { ConflictException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '@/modules/users/infrastructure/entities/user.entity';
import { ClientLoginDto } from '@/modules/auth/api/dto/client/client-login.dto';
import { IHasher, IHasherToken } from '@/common/contracts/hasher.contract';
import { IAccessTokenPayloadClient } from '@/common/types/access-token.payload';
import { TokenCryptoService } from '@/modules/auth/infrastructure/tokens/token-crypto.service';
import { Session } from '@/modules/auth/infrastructure/entities/session.entity';
import { ProfileClient } from '@/modules/client/profile/infrastructure/entities/profile-client.entity';

@Injectable()
export class ClientLoginWithEmailUseCase {
  constructor(
    @InjectRepository(ProfileClient)
    private readonly profileClientRepo: Repository<ProfileClient>,
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
    private readonly tokenCrypto: TokenCryptoService,
    @Inject(IHasherToken)
    private readonly hasher: IHasher
  ) { }

  async execute(dto: ClientLoginDto, ip?: string, userAgent?: string) {

    const profile = await this.profileClientRepo
      .createQueryBuilder("client")
      .select(
        [
          "client.id",
          "user.id",
          'user.email',
          'user.password',
          'user.email_verified_at'
        ]
      )
      .where('user.email = :email', { email: dto.email })
      .innerJoin('client.user', 'user')
      .getOne()


    const isValidPassword = await this.verifyPassword(
      profile?.user ?? null,
      dto.password,
    );

    if (!profile || !profile?.user || !profile?.user.password || !isValidPassword) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!profile.user.isVerified) {
      throw new ConflictException("Please verify your email first");
    }

    const tokens = await this.getTokens(profile.user, profile.id);

    const session = await this.createSession(profile.user, tokens.refreshToken.hash, ip, userAgent)

    return {
      user: profile.user,
      tokens: {
        accessToken: tokens.accessToken,
        refreshToken: `${session.id}.${tokens.refreshToken.raw}`
      }
    }
  }

  private async verifyPassword(user: User | null, password: string): Promise<boolean> {
    const FALLBACK_PASSWORD = await this.hasher.hash(
      'fallbackInvalidPassword',
    );

    const isValid = await this.hasher.verify(
      user?.password ?? FALLBACK_PASSWORD,
      password,
    );

    return isValid;
  }

  private async getTokens(user: User, profileId: string) {

    const [accessToken, refreshToken] = await Promise.all([
      this.tokenCrypto.createAccessToken<IAccessTokenPayloadClient>({
        sub: user.id,
        email: user.email,
        profile: profileId
      }),
      this.tokenCrypto.createRefreshToken()
    ]);

    return {
      accessToken, refreshToken
    }
  };

  private async createSession(user: User, refreshTokenHash: string, ip?: string, ua?: string) {

    const newSession = this.sessionRepository.create({
      user,
      ip_address: ip,
      user_agent: ua,
      type: 'refresh_token',
      secret_hash: refreshTokenHash,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    })

    return this.sessionRepository.save(newSession);
  }

}
