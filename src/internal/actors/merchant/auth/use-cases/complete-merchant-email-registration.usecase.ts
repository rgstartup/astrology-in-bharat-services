import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb, DrizzleTx } from '@/core/drizzledb/drizzle.types';
import {
  merchantAccounts,
  sessions,
  users,
} from '@/core/drizzledb/schema';
import { PlatformEnum, RoleEnum } from '@/core/enums';
import {
  type IHasher,
  IHasherToken,
} from '../../../../../shared/contracts/hasher.contract';
import { CompleteMerchantRegisterDto } from '../dto/merchant-register.dto';
import { MerchantTokenCryptoService } from '../services/token-crypto.service';

@Injectable()
export class CompleteMerchantEmailRegistrationUseCase {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly tokenCrypto: MerchantTokenCryptoService,
    @Inject(IHasherToken) private readonly hasher: IHasher,
  ) {}

  async execute(
    dto: CompleteMerchantRegisterDto,
    ip?: string,
    userAgent?: string,
  ) {
    await this.verifyToken(dto.token, dto.email);
    return this.db.transaction(async (tx) => {
      const user = await this.getPendingMerchant(tx, dto.email);
      const hashedPassword = await this.hasher.hash(dto.password);

      const [updatedUser] = await tx
        .update(users)
        .set({
          full_name: dto.name,
          name: dto.name,
          role: RoleEnum.MERCHANT,
          password: hashedPassword,
          email_verified_at: new Date(),
        })
        .where(eq(users.id, user.id))
        .returning();

      const account = await this.createOrUpdateAccount(tx, updatedUser, dto);
      const [accessToken, refresh] = await Promise.all([
        this.tokenCrypto.createAccessToken({
          sub: account.id,
          email: account.email ?? updatedUser.email,
        }),
        this.tokenCrypto.createRefreshToken(),
      ]);

      const [session] = await tx
        .insert(sessions)
        .values({
          user_id: updatedUser.id,
          ip_address: ip,
          user_agent: userAgent,
          type: 'refresh_token',
          secret_hash: refresh.hash,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        })
        .returning();

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

  private async getPendingMerchant(tx: DrizzleTx, email: string) {
    const user = await tx.query.users.findFirst({
      where: and(
        eq(users.email, email),
        eq(users.platform, PlatformEnum.MERCHANT),
      ),
    });
    if (!user) throw new UnauthorizedException('Merchant not found');
    if (user.email_verified_at) {
      throw new ConflictException('Merchant is already registered');
    }
    return user;
  }

  private async createOrUpdateAccount(
    tx: DrizzleTx,
    user: typeof users.$inferSelect,
    dto: CompleteMerchantRegisterDto,
  ) {
    const existing = await tx.query.merchantAccounts.findFirst({
      where: eq(merchantAccounts.user_id, user.id),
    });

    if (!existing) {
      const [inserted] = await tx
        .insert(merchantAccounts)
        .values({
          user_id: user.id,
          email: user.email,
          name: dto.name,
          avatar: user.avatar,
          shop_name: dto.shop_name,
          manager_name: dto.manager_name,
          phone: dto.phone,
          address: dto.address,
          city: dto.city,
          pincode: dto.pincode,
          description: dto.description,
        })
        .returning();
      return inserted;
    }

    const [updated] = await tx
      .update(merchantAccounts)
      .set({
        name: dto.name,
        email: user.email,
        avatar: user.avatar,
        shop_name: dto.shop_name ?? existing.shop_name,
        manager_name: dto.manager_name ?? existing.manager_name,
        phone: dto.phone ?? existing.phone,
        address: dto.address ?? existing.address,
        city: dto.city ?? existing.city,
        pincode: dto.pincode ?? existing.pincode,
        description: dto.description ?? existing.description,
      })
      .where(eq(merchantAccounts.id, existing.id))
      .returning();
    return updated;
  }
}

