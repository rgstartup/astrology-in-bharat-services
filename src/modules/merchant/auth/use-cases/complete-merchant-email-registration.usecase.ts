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
import { RoleEnum } from '@/modules/users/infrastructure/enums/Role.enum';
import { MerchantAccount } from '../../account/entities/account.entity';
import { CompleteMerchantRegisterDto } from '../dto/merchant-register.dto';
import { MerchantTokenCryptoService } from '../services/token-crypto.service';

@Injectable()
export class CompleteMerchantEmailRegistrationUseCase {
  constructor(
    private readonly db: DatabaseService,
    private readonly tokenCrypto: MerchantTokenCryptoService,
    @Inject(IHasherToken) private readonly hasher: IHasher,
  ) {}

  async execute(
    dto: CompleteMerchantRegisterDto,
    ip?: string,
    userAgent?: string,
  ) {
    await this.verifyToken(dto.token, dto.email);
    return this.db.transaction(async (qr) => {
      const user = await this.getPendingMerchant(qr, dto.email);
      user.full_name = dto.name;
      user.name = dto.name;
      user.role = RoleEnum.MERCHANT;
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

      if (
        payload.email !== email ||
        payload.platform !== PlatformEnum.MERCHANT
      ) {
        throw new BadRequestException('Token does not match merchant account');
      }
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException('Invalid or expired token');
    }
  }

  private async getPendingMerchant(qr: QueryRunner, email: string) {
    const user = await qr.manager.findOne(User, {
      where: { email, platform: PlatformEnum.MERCHANT },
    });
    if (!user) throw new UnauthorizedException('Merchant not found');
    if (user.isVerified()) {
      throw new ConflictException('Merchant is already registered');
    }
    return user;
  }

  private async createOrUpdateAccount(
    qr: QueryRunner,
    user: User,
    dto: CompleteMerchantRegisterDto,
  ) {
    const repository = qr.manager.getRepository(MerchantAccount);
    const account =
      (await repository.findOne({ where: { user: { id: user.id } } })) ??
      repository.create({ user, email: user.email });
    account.name = dto.name;
    account.email = user.email;
    account.avatar = user.avatar;
    account.shop_name = dto.shop_name ?? account.shop_name;
    account.manager_name = dto.manager_name ?? account.manager_name;
    account.phone = dto.phone ?? account.phone;
    account.address = dto.address ?? account.address;
    account.city = dto.city ?? account.city;
    account.pincode = dto.pincode ?? account.pincode;
    account.description = dto.description ?? account.description;
    return repository.save(account);
  }
}
