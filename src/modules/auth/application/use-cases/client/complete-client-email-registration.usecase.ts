import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  Inject,
  ConflictException,
} from '@nestjs/common';
import { DatabaseService } from '@/core/database/database.service';
import { TokenCryptoService } from '@/modules/auth/infrastructure/tokens/token-crypto.service';
import { ProfileClient } from '@/modules/client/profile/infrastructure/entities/profile-client.entity';
import { IHasherToken, IHasher } from '@/common/contracts/hasher.contract';
import { QueryRunner } from 'typeorm';
import { User } from '@/modules/users/infrastructure/entities/user.entity';
import { CompleteClientRegisterDto } from '@/modules/auth/api/dto/client/client-register.dto';
import { PlatformEnum } from '@/modules/users/infrastructure/enums/Platform.enum';
import { Session } from '@/modules/auth/infrastructure/entities/session.entity';
import { IAccessTokenPayloadClient } from '@/common/types/access-token.payload';

@Injectable()
export class CompleteClientEmailRegistrationUseCase {
  constructor(
    private readonly db: DatabaseService,
    private readonly tokenCrypto: TokenCryptoService,
    @Inject(IHasherToken) private readonly hasher: IHasher,
  ) { }

  async execute(dto: CompleteClientRegisterDto, ip?: string, userAgent?: string) {
    // 1. Verify Token
    await this.ensureTokenVerified(dto.token, dto.email)

    return this.db.transaction(async (queryRunner) => {

      const user = await this.ensureUserIsNotAlreadyRegistered(queryRunner, dto.email);

      const updatedUser = await this.updateUser(queryRunner, user, dto);

      const profile = await this.createProfile(queryRunner, updatedUser, dto);

      const tokens = await this.getTokens(user, profile.id)

      const session = await this.createSession(queryRunner, user, tokens.refreshToken.hash, ip, userAgent)

      return {
        user,
        tokens: {
          accessToken: tokens.accessToken,
          refreshToken: `${session.id}.${tokens.refreshToken.raw}`
        }
      }
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

  private async ensureUserIsNotAlreadyRegistered(qr: QueryRunner, email: string): Promise<User> {

    const existingUser = await qr.manager.findOneBy(User, { email, platform: PlatformEnum.CLIENT });
    if (!existingUser) {
      throw new UnauthorizedException('User not found');
    }

    if (existingUser.isVerified()) {
      throw new ConflictException('User is already registered');
    }

    return existingUser;
  }

  private async updateUser(qr: QueryRunner, user: User, dto: CompleteClientRegisterDto) {

    const userRepo = qr.manager.getRepository(User);

    const hashedPassword = await this.hasher.hash(dto.password);

    const updatedUser = new User;
    Object.assign(updatedUser, user);
    updatedUser.full_name = dto.full_name;
    updatedUser.password = hashedPassword;
    updatedUser.email_verified_at = new Date();

    await userRepo.update(
      { id: user.id },
      {
        full_name: updatedUser.full_name,
        password: updatedUser.password,
        email_verified_at: updatedUser.email_verified_at,
      },
    );

    return updatedUser;
  }

  private async createProfile(queryRunner: QueryRunner, user: User, dto: CompleteClientRegisterDto) {
    const profileClientRepo = queryRunner.manager.getRepository(ProfileClient);
    const newProfile = profileClientRepo.create({
      user,
      name: user.full_name,
      avatar: user.avatar,
      phone: dto.phone,
      gender: dto.gender,
      marital_status: dto.maritalStatus,
      occupation: dto.occupation,
      about_me: dto.aboutMe,
      date_of_birth: dto.birthDetails?.dateOfBirth
        ? new Date(dto.birthDetails.dateOfBirth)
        : null,
      time_of_birth: dto.birthDetails?.timeOfBirth,
      place_of_birth: dto.birthDetails?.birthPlace,
    })

    return profileClientRepo.save(newProfile);
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

  private async createSession(qr: QueryRunner, user: User, refreshTokenHash: string, ip?: string, ua?: string) {
    const sessionRepo = qr.manager.getRepository(Session);

    const newSession = sessionRepo.create({
      user,
      ip_address: ip,
      user_agent: ua,
      type: 'refresh_token',
      secret_hash: refreshTokenHash,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    })

    return sessionRepo.save(newSession);
  }
}
