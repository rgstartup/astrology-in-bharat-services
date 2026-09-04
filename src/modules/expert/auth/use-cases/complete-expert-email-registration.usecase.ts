import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { QueryRunner } from 'typeorm';
import { DatabaseService } from '@/core/database/database.service';
import { IHasher, IHasherToken } from '@/common/contracts/hasher.contract';
import { Session } from '@/modules/auth/infrastructure/entities/session.entity';
import { User } from '@/modules/users/infrastructure/entities/user.entity';
import { PlatformEnum } from '@/modules/users/infrastructure/enums/Platform.enum';
import { ExpertAccount } from '../../account/entities/account.entity';
import { CompleteExpertRegisterDto } from '../dto/expert-register.dto';
import { ExpertTokenCryptoService } from '../services/token-crypto.service';

@Injectable()
export class CompleteExpertEmailRegistrationUseCase {
  constructor(
    private readonly db: DatabaseService,
    private readonly tokenCrypto: ExpertTokenCryptoService,
    @Inject(IHasherToken) private readonly hasher: IHasher,
  ) {}

  async execute(
    dto: CompleteExpertRegisterDto,
    ip?: string,
    userAgent?: string,
  ) {
    await this.verifyToken(dto.token, dto.email);
    return this.db.transaction(async (qr) => {
      const user = await this.getPendingExpert(qr, dto.email);
      user.full_name = dto.name;
      user.name = dto.name;
      user.password = await this.hasher.hash(dto.password);
      user.email_verified_at = new Date();
      await qr.manager.save(User, user);

      const account = await this.createOrUpdateAccount(qr, user, dto);
      const [accessToken, refresh] = await Promise.all([
        this.tokenCrypto.createAccessToken({
          sub: account.id,
          email: account.email,
        }),
        this.tokenCrypto.createRefreshToken(),
      ]);
      const session = await qr.manager.save(
        Session,
        qr.manager.create(Session, {
          user,
          ip_address: ip,
          user_agent: userAgent,
          type: 'refresh_token',
          secret_hash: refresh.hash,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        }),
      );
      return { accessToken, refreshToken: `${session.id}.${refresh.raw}` };
    });
  }

  private async verifyToken(token: string, email: string) {
    try {
      const payload = await this.tokenCrypto.verifyJwt<{
        email: string;
        platform: PlatformEnum;
      }>(token);
      if (payload.email !== email || payload.platform !== PlatformEnum.EXPERT) {
        throw new BadRequestException('Token does not match expert account');
      }
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException('Invalid or expired token');
    }
  }

  private async getPendingExpert(qr: QueryRunner, email: string) {
    const user = await qr.manager.findOne(User, {
      where: { email, platform: PlatformEnum.EXPERT },
    });
    if (!user) throw new UnauthorizedException('Expert not found');
    if (user.isVerified()) {
      throw new ConflictException('Expert is already registered');
    }
    return user;
  }

  private async createOrUpdateAccount(
    qr: QueryRunner,
    user: User,
    dto: CompleteExpertRegisterDto,
  ) {
    const repository = qr.manager.getRepository(ExpertAccount);
    const account =
      (await repository.findOne({ where: { user: { id: user.id } } })) ??
      repository.create({ user, email: user.email });
    account.name = dto.name;
    account.email = user.email;
    account.avatar = user.avatar;
    account.phone = dto.phone ?? account.phone;
    account.gender = dto.gender ?? account.gender;
    account.specialization = dto.specialization ?? account.specialization;
    account.languages = dto.languages ?? account.languages;
    account.experience_in_years =
      dto.experience_in_years ?? account.experience_in_years;
    account.about_me = dto.aboutMe ?? account.about_me;
    return repository.save(account);
  }
}
