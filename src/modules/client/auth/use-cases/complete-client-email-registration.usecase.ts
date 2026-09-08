import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { DatabaseService } from '@/core/database/database.service';
import { TokenCryptoService } from '../services/token-crypto.service';
import { ClientAccount } from '@/modules/client/account/entities/account.entity';
import { QueryRunner } from 'typeorm';
import { User } from '@/modules/users/infrastructure/entities/user.entity';
import { CompleteClientRegisterDto } from '../dto/client-register.dto';
import { PlatformEnum } from '@/modules/users/infrastructure/enums/Platform.enum';
import { Session } from '@/modules/auth/infrastructure/entities/session.entity';
import { IAccessTokenPayloadClient } from '@/common/types/access-token.payload';
import {
  Otp,
  OtpPurposeEnum,
} from '@/modules/auth/infrastructure/entities/otp.entity';
import { createHash } from 'crypto';

@Injectable()
export class CompleteClientEmailRegistrationUseCase {
  constructor(
    private readonly db: DatabaseService,
    private readonly tokenCrypto: TokenCryptoService,
  ) {}

  async execute(
    dto: CompleteClientRegisterDto,
    ip?: string,
    userAgent?: string,
  ) {
    return this.db.transaction(async (queryRunner) => {
      // 1. Verify and consume OTP
      await this.verifyAndConsumeOtp(queryRunner, dto.email, dto.otp);

      // 2. Ensure user exists and is not already verified
      const user = await this.ensureUserIsNotAlreadyRegistered(
        queryRunner,
        dto.email,
      );

      // 3. Mark email verified
      const updatedUser = await this.markEmailVerified(queryRunner, user);

      // 4. Create / setup client account
      const account = await this.createAccount(queryRunner, updatedUser);

      // 5. Generate tokens and session
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

  private async verifyAndConsumeOtp(
    qr: QueryRunner,
    email: string,
    inputOtp: string,
  ) {
    const otpRepo = qr.manager.getRepository(Otp);

    const otpEntry = await otpRepo.findOne({
      where: {
        email,
        purpose: OtpPurposeEnum.REGISTRATION,
      },
      order: { created_at: 'DESC' },
    });

    if (!otpEntry) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    if (new Date() > otpEntry.expires_at) {
      await otpRepo.delete({ id: otpEntry.id });
      throw new BadRequestException(
        'OTP has expired. Please request a new OTP.',
      );
    }

    if (otpEntry.attempts >= 5) {
      await otpRepo.delete({ id: otpEntry.id });
      throw new BadRequestException(
        'Maximum verification attempts exceeded. Please request a new OTP.',
      );
    }

    const hashedInputOtp = createHash('sha256').update(inputOtp).digest('hex');

    if (hashedInputOtp !== otpEntry.otp) {
      otpEntry.attempts += 1;
      await otpRepo.save(otpEntry);
      throw new BadRequestException('Invalid OTP');
    }

    // On successful verification, delete the OTP entry from auth.otp table
    await otpRepo.delete({ id: otpEntry.id });
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

  private async markEmailVerified(qr: QueryRunner, user: User) {
    const userRepo = qr.manager.getRepository(User);
    user.email_verified_at = new Date();

    await userRepo.update(
      { id: user.id },
      { email_verified_at: user.email_verified_at },
    );

    return user;
  }

  private async createAccount(queryRunner: QueryRunner, user: User) {
    const clientAccountRepo = queryRunner.manager.getRepository(ClientAccount);

    const existingAccount = await clientAccountRepo.findOne({
      where: { user: { id: user.id } },
    });

    const firstName = user.first_name;
    const lastName = user.last_name;
    const fullName =
      [firstName, lastName].filter(Boolean).join(' ') ||
      user.full_name ||
      user.name;

    if (existingAccount) {
      existingAccount.email = user.email;
      existingAccount.first_name = firstName;
      existingAccount.last_name = lastName;
      existingAccount.name = fullName;
      return clientAccountRepo.save(existingAccount);
    }

    const newAccount = clientAccountRepo.create({
      user,
      email: user.email,
      first_name: firstName,
      last_name: lastName,
      name: fullName,
      gender: 'other',
    });

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
