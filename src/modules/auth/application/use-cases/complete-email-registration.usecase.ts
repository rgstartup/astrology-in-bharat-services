import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { DatabaseService } from '@/core/database/database.service';
import { TokenCryptoService } from '../../infrastructure/tokens/token-crypto.service';
import { UsersFacade } from '@/modules/users/application/users.facade';
import { IssueAuthTokensUseCase } from './issue-auth-tokens.usecase';
import { CompleteRegisterDto } from '../../api/dto/email-register.dto';
import { AuthProfileCreationResolver } from '../strategies/create-profile/auth-profile-creation.resolver';
import { ProfileClient } from '@/modules/client/profile/infrastructure/entities/profile-client.entity';
import { ProfileExpert } from '@/modules/expert/profile/infrastructure/entities/profile-expert.entity';
import { Address } from '@/common/address/address.entity';
import { RoleEnum } from '@/modules/users/infrastructure/enums/Role.enum';
import { IHasherToken, IHasher } from '@/common/contracts/hasher.contract';

@Injectable()
export class CompleteEmailRegistrationUseCase {
  constructor(
    private readonly db: DatabaseService,
    private readonly usersFacade: UsersFacade,
    private readonly tokenCrypto: TokenCryptoService,
    @Inject(IHasherToken) private readonly hasher: IHasher,
    private readonly issueTokens: IssueAuthTokensUseCase,
    private readonly profileCreationResolver: AuthProfileCreationResolver,
  ) {}

  async execute(dto: CompleteRegisterDto, ip?: string, userAgent?: string) {
    // 1. Verify Token
    let payload: { userId: string; email: string } | undefined;
    try {
      payload = await this.tokenCrypto.verifyJwt<{
        userId: string;
        email: string;
      }>(dto.token);
    } catch {
      throw new BadRequestException('Invalid or expired token');
    }

    if (payload?.email !== dto.email) {
      throw new BadRequestException('Token does not match the provided email');
    }

    const user = await this.usersFacade.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (user.password || user.name) {
      throw new BadRequestException('User is already fully registered');
    }

    const hashedPassword = await this.hasher.hash(dto.password);

    const response = await this.db.transaction(async (queryRunner) => {
      // 2. Update User (Name, Password, Phone, email_verified_at)
      await queryRunner.manager.update(
        'users',
        { id: user.id },
        {
          name: dto.name,
          password: hashedPassword,
          email_verified_at: new Date(),
        },
      );

      // Refresh user object
      const updatedUser = await this.usersFacade.findByEmail(
        user.email,
        queryRunner,
      );

      // 3. Ensure profile is created
      await this.profileCreationResolver.ensureProfile(
        updatedUser!,
        queryRunner,
      );

      // 4. Update appropriate profile with extra details
      if (updatedUser!.roles.includes(RoleEnum.EXPERT)) {
        const profileUpdates: Partial<ProfileExpert> = {
          name: dto.name,
          phone_number: dto.phone,
          gender: dto.gender as 'male' | 'female' | 'other',
          bio: dto.aboutMe,
          experience_in_years: dto.experience_in_years || 0,
          specialization: dto.specialization || '',
          languages: dto.languages || '',
        };

        if (dto.birthDetails) {
          profileUpdates.date_of_birth = dto.birthDetails.dateOfBirth
            ? new Date(dto.birthDetails.dateOfBirth)
            : null;
        }

        await queryRunner.manager.update(
          ProfileExpert,
          { user: { id: user.id } },
          profileUpdates as any,
        );

        if (dto.address) {
          const profile = await queryRunner.manager.findOne(ProfileExpert, {
            where: { user: { id: user.id } },
          });
          if (profile) {
            const newAddress = new Address();
            Object.assign(newAddress, dto.address);
            newAddress.profile_expert = profile;
            await queryRunner.manager.save(Address, newAddress);
          }
        }
      } else if (
        updatedUser!.roles.includes(RoleEnum.MERCHANT as unknown as RoleEnum)
      ) {
        const { ProfileMerchant } = await import(
          '../../../merchant/profile/infrastructure/entities/profile-merchant.entity'
        );
        let merchantProfile = await queryRunner.manager.findOne(
          ProfileMerchant,
          {
            where: { user_id: user.id },
          },
        );

        const profileUpdates: Partial<typeof ProfileMerchant.prototype> = {
          shopName: dto.shopName || dto.name,
          phone: dto.phone || '',
        };

        if (merchantProfile) {
          Object.assign(merchantProfile, profileUpdates);
          merchantProfile = await queryRunner.manager.save(
            ProfileMerchant,
            merchantProfile,
          );
        } else {
          merchantProfile = queryRunner.manager.create(ProfileMerchant, {
            user: { id: user.id },
            user_id: user.id,
            ...profileUpdates,
          });
          merchantProfile = await queryRunner.manager.save(
            ProfileMerchant,
            merchantProfile,
          );
        }

        if (dto.address) {
          if (merchantProfile) {
            merchantProfile.address =
              dto.address.line1 || merchantProfile.address;
            merchantProfile.city = dto.address.city || merchantProfile.city;
            merchantProfile.pincode =
              dto.address.zipCode || merchantProfile.pincode;
            await queryRunner.manager.save(ProfileMerchant, merchantProfile);
          }
        }
      } else {
        const profileUpdates: Partial<ProfileClient> = {
          name: dto.name,
          phone: dto.phone,
          gender: dto.gender as 'male' | 'female' | 'other',
          marital_status: dto.maritalStatus,
          occupation: dto.occupation,
          about_me: dto.aboutMe,
        };

        if (dto.birthDetails) {
          profileUpdates.date_of_birth = dto.birthDetails.dateOfBirth
            ? new Date(dto.birthDetails.dateOfBirth)
            : null;
          profileUpdates.time_of_birth = dto.birthDetails.timeOfBirth;
          profileUpdates.place_of_birth = dto.birthDetails.birthPlace;
        }

        await queryRunner.manager.update(
          ProfileClient,
          { user: { id: user.id } },
          profileUpdates as any,
        );

        if (dto.address) {
          const profile = await queryRunner.manager.findOne(ProfileClient, {
            where: { user: { id: user.id } },
          });
          if (profile) {
            const newAddress = new Address();
            Object.assign(newAddress, dto.address);
            newAddress.profile_client = profile;
            await queryRunner.manager.save(Address, newAddress);
          }
        }
      }

      // 5. Issue Tokens
      const tokens = await this.issueTokens.execute(
        updatedUser!,
        updatedUser!.roles[0],
        ip,
        userAgent,
        queryRunner,
      );

      return { user: updatedUser, tokens };
    });

    return response;
  }
}
