import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  Inject,
  ConflictException,
} from '@nestjs/common';
import { DatabaseService } from '@/core/database/database.service';
import { TokenCryptoService } from '../services/token-crypto.service';
import { ClientAccount } from '@/modules/client/account/entities/account.entity';
import { IHasherToken, IHasher } from '@/common/contracts/hasher.contract';
import { QueryRunner } from 'typeorm';
import { User } from '@/modules/users/infrastructure/entities/user.entity';
import { CompleteClientRegisterDto } from '../dto/client-register.dto';
import { PlatformEnum } from '@/modules/users/infrastructure/enums/Platform.enum';
import { Session } from '@/modules/auth/infrastructure/entities/session.entity';
import { IAccessTokenPayloadClient } from '@/common/types/access-token.payload';
import { Address, AddressTag } from '@/common/address/address.entity';

@Injectable()
export class CompleteClientEmailRegistrationUseCase {
  constructor(
    private readonly db: DatabaseService,
    private readonly tokenCrypto: TokenCryptoService,
    @Inject(IHasherToken) private readonly hasher: IHasher,
  ) {}

  async execute(
    dto: CompleteClientRegisterDto,
    ip?: string,
    userAgent?: string,
  ) {
    // 1. Verify Token
    await this.ensureTokenVerified(dto.token, dto.email);

    return this.db.transaction(async (queryRunner) => {
      const user = await this.ensureUserIsNotAlreadyRegistered(
        queryRunner,
        dto.email,
      );

      const updatedUser = await this.updateUser(queryRunner, user, dto);

      const account = await this.createAccount(queryRunner, updatedUser, dto);

      const tokens = await this.getTokens(account);

      const session = await this.createSession(
        queryRunner,
        updatedUser,
        tokens.refreshToken.hash,
        ip,
        userAgent,
      );

      return {
        accessToken: tokens.accessToken,
        refreshToken: `${session.id}.${tokens.refreshToken.raw}`,
      };
    });
  }

  private async ensureTokenVerified(token: string, email: string) {
    let payload: { userId: string; email: string } | undefined;

    try {
      payload = await this.tokenCrypto.verifyJwt<{
        userId: string;
        email: string;
      }>(token);
    } catch (_e) {
      throw new BadRequestException('Invalid or expired token');
    }

    if (payload?.email !== email) {
      throw new BadRequestException('Token does not match the provided email');
    }
  }

  private async ensureUserIsNotAlreadyRegistered(
    qr: QueryRunner,
    email: string,
  ): Promise<User> {
    const existingUser = await qr.manager.findOneBy(User, {
      email,
      platform: PlatformEnum.CLIENT,
    });
    if (!existingUser) {
      throw new UnauthorizedException('User not found');
    }

    if (existingUser.isVerified()) {
      throw new ConflictException('User is already registered');
    }

    return existingUser;
  }

  private async updateUser(
    qr: QueryRunner,
    user: User,
    dto: CompleteClientRegisterDto,
  ) {
    const userRepo = qr.manager.getRepository(User);

    const hashedPassword = await this.hasher.hash(dto.password);

    const updatedUser = new User();
    Object.assign(updatedUser, user);
    updatedUser.full_name = dto.full_name;
    updatedUser.name = dto.full_name;
    updatedUser.password = hashedPassword;
    updatedUser.email_verified_at = new Date();

    await userRepo.update(
      { id: user.id },
      {
        full_name: updatedUser.full_name,
        name: updatedUser.name,
        password: updatedUser.password,
        email_verified_at: updatedUser.email_verified_at,
      },
    );

    return updatedUser;
  }

  private async createAccount(
    queryRunner: QueryRunner,
    user: User,
    dto: CompleteClientRegisterDto,
  ) {
    const clientAccountRepo = queryRunner.manager.getRepository(ClientAccount);

    let existingAccount = await clientAccountRepo.findOne({
      where: { user: { id: user.id } },
    });

    if (existingAccount) {
      existingAccount.name = user.full_name;
      existingAccount.email = user.email;
      existingAccount.phone = dto.phone || existingAccount.phone;
      existingAccount.gender = dto.gender || existingAccount.gender;
      existingAccount.marital_status =
        dto.maritalStatus || existingAccount.marital_status;
      existingAccount.occupation =
        dto.occupation || existingAccount.occupation;
      existingAccount.about_me = dto.aboutMe || existingAccount.about_me;
      if (dto.birthDetails?.dateOfBirth) {
        existingAccount.date_of_birth = new Date(dto.birthDetails.dateOfBirth);
      }
      existingAccount.time_of_birth =
        dto.birthDetails?.timeOfBirth || existingAccount.time_of_birth;
      existingAccount.place_of_birth =
        dto.birthDetails?.birthPlace || existingAccount.place_of_birth;

      return clientAccountRepo.save(existingAccount);
    }

    const newAccount = clientAccountRepo.create({
      user,
      name: user.full_name,
      email: user.email,
      avatar: user.avatar,
      phone: dto.phone,
      gender: dto.gender ?? 'other',
      marital_status: dto.maritalStatus,
      occupation: dto.occupation,
      about_me: dto.aboutMe,
      date_of_birth: dto.birthDetails?.dateOfBirth
        ? new Date(dto.birthDetails.dateOfBirth)
        : null,
      time_of_birth: dto.birthDetails?.timeOfBirth,
      place_of_birth: dto.birthDetails?.birthPlace,
    });

    if (dto.address) {
      const address = queryRunner.manager.create(Address, {
        line1:
          [dto.address.line1, dto.address.line2].filter(Boolean).join(', ') ||
          dto.address.house_no ||
          '',
        house_no: dto.address.house_no,
        city: dto.address.city,
        district: dto.address.district,
        state: dto.address.state,
        country: dto.address.country,
        zip_code: dto.address.zip_code || dto.address.pincode || '',
        pincode: dto.address.pincode,
        is_primary: dto.address.is_primary ?? true,
        tag: dto.address.tag || AddressTag.HOME,
      });
      newAccount.addresses = [address];
    }

    return clientAccountRepo.save(newAccount);
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
    qr: QueryRunner,
    user: User,
    refreshTokenHash: string,
    ip?: string,
    ua?: string,
  ) {
    const sessionRepo = qr.manager.getRepository(Session);

    const newSession = sessionRepo.create({
      user,
      ip_address: ip,
      user_agent: ua,
      type: 'refresh_token',
      secret_hash: refreshTokenHash,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    return sessionRepo.save(newSession);
  }
}
