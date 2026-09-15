import {
  BadRequestException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IHasher, IHasherToken } from '@/common/contracts/hasher.contract';
import { Session } from '@/modules/auth/infrastructure/entities/session.entity';
import { User } from '@/modules/users/infrastructure/entities/user.entity';
import { PlatformEnum } from '@/modules/users/infrastructure/enums/Platform.enum';
import { MerchantAccount } from '../../account/entities/account.entity';
import { MerchantLoginDto } from '../dto/merchant-login.dto';
import { MerchantTokenCryptoService } from '../services/token-crypto.service';

@Injectable()
export class MerchantLoginWithEmailUseCase {
  constructor(
    @InjectRepository(MerchantAccount)
    private readonly merchantRepo: Repository<MerchantAccount>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Session)
    private readonly sessionRepo: Repository<Session>,
    private readonly tokenCrypto: MerchantTokenCryptoService,
    @Inject(IHasherToken) private readonly hasher: IHasher,
  ) {}

  async execute(dto: MerchantLoginDto, ip?: string, userAgent?: string) {
    const user = await this.userRepo.findOne({
      where: { email: dto.email, platform: PlatformEnum.MERCHANT },
    });

    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isVerified()) {
      throw new BadRequestException('Email not verified. Please complete registration.');
    }

    if (user.is_blocked) {
      throw new UnauthorizedException('Your account has been blocked');
    }

    const isPasswordValid = await this.hasher.verify(user.password, dto.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const merchant = await this.merchantRepo.findOne({
      where: { user: { id: user.id } },
    });

    if (!merchant) {
      throw new UnauthorizedException('Merchant account not found');
    }

    if (merchant.is_blocked) {
      throw new UnauthorizedException('Your merchant account has been blocked');
    }

    const [accessToken, refresh] = await Promise.all([
      this.tokenCrypto.createAccessToken({
        sub: merchant.id,
        email: merchant.email ?? user.email,
      }),
      this.tokenCrypto.createRefreshToken(),
    ]);

    const session = await this.sessionRepo.save(
      this.sessionRepo.create({
        user,
        ip_address: ip,
        user_agent: userAgent,
        type: 'refresh_token',
        secret_hash: refresh.hash,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      }),
    );

    return {
      accessToken,
      refreshToken: `${session.id}.${refresh.raw}`,
      merchant: {
        id: merchant.id,
        name: merchant.name,
        email: merchant.email ?? user.email,
        shop_name: merchant.shop_name,
        status: merchant.status,
      },
    };
  }
}
