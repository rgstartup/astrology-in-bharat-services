import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { DatabaseService } from '@/core/database/database.service';
import { TokenCryptoService } from '../../infrastructure/tokens/token-crypto.service';
import { UsersFacade } from '@/modules/users/application/users.facade';
import { AuthTokenService } from '../services/auth-token.service';
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
    private readonly authTokenService: AuthTokenService,
    private readonly profileCreationResolver: AuthProfileCreationResolver,
  ) {}

  async execute(dto: CompleteRegisterDto, ip?: string, userAgent?: string) {
    console.log('[DEBUG][CompleteRegistration] execute() called');
    console.log('[DEBUG][CompleteRegistration] DTO received:', JSON.stringify({
      email: dto.email,
      token: dto.token ? dto.token.substring(0, 30) + '...' : 'MISSING',
      name: dto.name,
      phone: dto.phone,
      gender: dto.gender,
      maritalStatus: dto.maritalStatus,
      occupation: dto.occupation,
      birthDetails: dto.birthDetails,
    }, null, 2));

    // 1. Verify Token
    let payload: { userId: string; email: string } | undefined;
    try {
      payload = await this.tokenCrypto.verifyJwt<{
        userId: string;
        email: string;
      }>(dto.token);
      console.log('[DEBUG][CompleteRegistration] Token verified, payload:', payload);
    } catch (e) {
      console.error('[DEBUG][CompleteRegistration] Token verification FAILED:', e);
      throw new BadRequestException('Invalid or expired token');
    }

    if (payload?.email !== dto.email) {
      console.error('[DEBUG][CompleteRegistration] Email mismatch! Token email:', payload?.email, 'DTO email:', dto.email);
      throw new BadRequestException('Token does not match the provided email');
    }

    const user = await this.usersFacade.findByEmail(dto.email);
    if (!user) {
      console.error('[DEBUG][CompleteRegistration] User NOT found for email:', dto.email);
      throw new UnauthorizedException('User not found');
    }
    console.log('[DEBUG][CompleteRegistration] User found:', user.id, 'name:', user.name, 'password exists:', !!user.password);

    if (user.password || user.name) {
      console.error('[DEBUG][CompleteRegistration] User already fully registered! name:', user.name, 'hasPassword:', !!user.password);
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
      console.log('[DEBUG][CompleteRegistration] Calling ensureProfile...');
      await this.profileCreationResolver.ensureProfile(
        updatedUser!,
        queryRunner,
      );
      console.log('[DEBUG][CompleteRegistration] ensureProfile done. User roles:', updatedUser!.roles);

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
          { user_id: user.id },
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

        console.log('[DEBUG][CompleteRegistration] Client profile updates to save:', profileUpdates);

        let clientProfile = await queryRunner.manager.findOne(ProfileClient, {
          where: { user_id: user.id },
        });
        console.log('[DEBUG][CompleteRegistration] Found clientProfile:', clientProfile ? clientProfile.id : 'NOT FOUND');

        // If ensureProfile created it via facade (different connection), it may not be
        // visible in this queryRunner yet. Create it directly if missing.
        if (!clientProfile) {
          console.log('[DEBUG][CompleteRegistration] Creating clientProfile directly via queryRunner...');
          clientProfile = queryRunner.manager.create(ProfileClient, {
            user_id: user.id,
            email: user.email,
          });
          clientProfile = await queryRunner.manager.save(ProfileClient, clientProfile);
          console.log('[DEBUG][CompleteRegistration] ClientProfile created with id:', clientProfile.id);
        }

        Object.assign(clientProfile, profileUpdates);
        await queryRunner.manager.save(ProfileClient, clientProfile);
        console.log('[DEBUG][CompleteRegistration] ClientProfile saved successfully with details!');

        if (dto.address) {
          const profile = await queryRunner.manager.findOne(ProfileClient, {
            where: { user_id: user.id },
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
      const tokens = await this.authTokenService.issueAuthTokens(
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
