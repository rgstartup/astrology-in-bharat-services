import {
  BadRequestException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import {
  merchantAccounts,
  sessions,
  users,
} from '@/core/drizzledb/schema';
import { PlatformEnum } from '@/core/enums';
import {
  type IHasher,
  IHasherToken,
} from '../../../../../shared/contracts/hasher.contract';
import { MerchantLoginDto } from '../dto/merchant-login.dto';
import { MerchantTokenCryptoService } from '../services/token-crypto.service';

@Injectable()
export class MerchantLoginWithEmailUseCase {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly tokenCrypto: MerchantTokenCryptoService,
    @Inject(IHasherToken) private readonly hasher: IHasher,
  ) {}

  async execute(dto: MerchantLoginDto, ip?: string, userAgent?: string) {
    const user = await this.db.query.users.findFirst({
      where: and(
        eq(users.email, dto.email),
        eq(users.platform, PlatformEnum.MERCHANT),
      ),
    });

    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.email_verified_at) {
      throw new BadRequestException(
        'Email not verified. Please complete registration.',
      );
    }

    if (user.is_blocked) {
      throw new UnauthorizedException('Your account has been blocked');
    }

    const isPasswordValid = await this.hasher.verify(
      user.password,
      dto.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const merchant = await this.db.query.merchantAccounts.findFirst({
      where: eq(merchantAccounts.user_id, user.id),
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

    const [session] = await this.db
      .insert(sessions)
      .values({
        user_id: user.id,
        ip_address: ip,
        user_agent: userAgent,
        type: 'refresh_token',
        secret_hash: refresh.hash,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      })
      .returning();

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

