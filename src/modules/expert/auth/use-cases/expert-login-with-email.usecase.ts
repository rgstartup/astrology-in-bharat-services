import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IHasher, IHasherToken } from '@/common/contracts/hasher.contract';
import { Session } from '@/modules/auth/infrastructure/entities/session.entity';
import { User } from '@/modules/users/infrastructure/entities/user.entity';
import { ExpertAccount } from '../../account/entities/account.entity';
import { ExpertLoginDto } from '../dto/expert-login.dto';
import { ExpertTokenCryptoService } from '../services/token-crypto.service';

@Injectable()
export class ExpertLoginWithEmailUseCase {
  constructor(
    @InjectRepository(ExpertAccount)
    private readonly experts: Repository<ExpertAccount>,
    @InjectRepository(Session) private readonly sessions: Repository<Session>,
    private readonly tokenCrypto: ExpertTokenCryptoService,
    @Inject(IHasherToken) private readonly hasher: IHasher,
  ) {}

  async execute(dto: ExpertLoginDto, ip?: string, userAgent?: string) {
    const expert = await this.experts
      .createQueryBuilder('expert')
      .addSelect(['user.password', 'user.email_verified_at', 'user.is_blocked'])
      .innerJoinAndSelect('expert.user', 'user')
      .where('user.email = :email', { email: dto.email })
      .getOne();

    const fallback = await this.hasher.hash('fallbackInvalidPassword');
    const valid = await this.hasher.verify(
      expert?.user.password ?? fallback,
      dto.password,
    );
    if (!expert?.user.password || !valid) {
      throw new UnauthorizedException('Invalid email or password');
    }
    if (!expert.user.email_verified_at) {
      throw new ConflictException('Please verify your email first');
    }
    if (expert.is_blocked || expert.user.is_blocked) {
      throw new ForbiddenException('Your account has been suspended');
    }
    return this.issueSession(expert, expert.user, ip, userAgent);
  }

  private async issueSession(
    expert: ExpertAccount,
    user: User,
    ip?: string,
    userAgent?: string,
  ) {
    const [accessToken, refresh] = await Promise.all([
      this.tokenCrypto.createAccessToken({
        sub: expert.id,
        email: expert.email,
      }),
      this.tokenCrypto.createRefreshToken(),
    ]);
    const session = await this.sessions.save(
      this.sessions.create({
        user,
        ip_address: ip,
        user_agent: userAgent,
        type: 'refresh_token',
        secret_hash: refresh.hash,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      }),
    );
    return { accessToken, refreshToken: `${session.id}.${refresh.raw}` };
  }
}
