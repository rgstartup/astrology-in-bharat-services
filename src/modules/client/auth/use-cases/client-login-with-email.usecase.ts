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
import { PlatformEnum } from '@/modules/users/infrastructure/enums/Platform.enum';
import {
  Otp,
  OtpPurposeEnum,
} from '@/modules/auth/infrastructure/entities/otp.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { randomInt, createHash } from 'crypto';

@Injectable()
export class ClientLoginWithEmailUseCase {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(ClientAccount)
    private readonly clientAccountRepo: Repository<ClientAccount>,
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
    @InjectRepository(Otp)
    private readonly otpRepo: Repository<Otp>,
    private readonly tokenCrypto: TokenCryptoService,
    private readonly eventEmitter: EventEmitter2,
    @Inject(IHasherToken)
    private readonly hasher: IHasher,
  ) {}

  async execute(dto: ClientLoginDto, ip?: string, userAgent?: string) {
    const user = await this.userRepo
      .createQueryBuilder('user')
      .select([
        'user.id',
        'user.email',
        'user.password',
        'user.email_verified_at',
        'user.is_blocked',
        'user.first_name',
        'user.last_name',
        'user.name',
        'user.full_name',
      ])
      .where('user.email = :email', { email: dto.email })
      .andWhere('user.platform = :platform', { platform: PlatformEnum.CLIENT })
      .getOne();

    const isValidPassword = await this.verifyPassword(
      user ?? null,
      dto.password,
    );

    if (!user || !user.password || !isValidPassword) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.email_verified_at) {
      await this.sendVerificationOtp(user);
      throw new ConflictException(
        'Please verify your email first. A new OTP has been sent to your email.',
      );
    }

    let account = await this.clientAccountRepo.findOne({
      where: { user: { id: user.id } },
    });

    if (!account) {
      const firstName = user.first_name;
      const lastName = user.last_name;
      const fullName =
        [firstName, lastName].filter(Boolean).join(' ') ||
        user.full_name ||
        user.name;

      account = await this.clientAccountRepo.save(
        this.clientAccountRepo.create({
          user,
          email: user.email,
          first_name: firstName,
          last_name: lastName,
          name: fullName,
        }),
      );
    }

    if (account.is_blocked || user.is_blocked) {
      throw new ForbiddenException('Your account has been suspended');
    }

    const tokens = await this.getTokens(account);

    const session = await this.createSession(
      user,
      tokens.refreshToken.hash,
      ip,
      userAgent,
    );

    return {
      accessToken: tokens.accessToken,
      refreshToken: `${session.id}.${tokens.refreshToken.raw}`,
    };
  }

  private async sendVerificationOtp(user: User) {
    // Remove previous OTP for this email with purpose: REGISTRATION
    await this.otpRepo.delete({
      email: user.email,
      purpose: OtpPurposeEnum.REGISTRATION,
    });

    const otp = randomInt(100000, 1000000).toString();
    const hashedOtp = createHash('sha256').update(otp).digest('hex');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const newOtp = this.otpRepo.create({
      email: user.email,
      user,
      otp: hashedOtp,
      purpose: OtpPurposeEnum.REGISTRATION,
      attempts: 0,
      expires_at: expiresAt,
    });

    await this.otpRepo.save(newOtp);

    this.eventEmitter.emit('auth.client.registered', {
      userId: user.id,
      email: user.email,
      name: user.full_name || undefined,
      role: 'client',
      otp,
    });
  }

  private async verifyPassword(
    user: User | null,
    password: string,
  ): Promise<boolean> {
    const FALLBACK_PASSWORD = await this.hasher.hash('fallbackInvalidPassword');

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
