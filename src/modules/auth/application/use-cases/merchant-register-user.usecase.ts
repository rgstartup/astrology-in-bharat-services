import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MerchantRegisterDto } from '../../api/dto/merchant-register.dto';
import { RegistrationPolicy } from '../../domain/policies/registration.policy';
import { DatabaseService } from '@/core/database/database.service';
import { Argon2PasswordHasher } from '../../infrastructure/hashing/argon2-password.hasher';
import { TokenCryptoService } from '../../infrastructure/tokens/token-crypto.service';
import { IssueAuthTokensUseCase } from './issue-auth-tokens.usecase';
import { UsersFacade } from '@/modules/users/application/users.facade';
import { UserRegisteredEvent } from '../../domain/events/user-registered.event';
import { User } from '@/modules/users/infrastructure/entities/user.entity';
import { AuthProfileCreationResolver } from '../strategies/auth-profile-creation.resolver';
import { ProfileMerchant } from '@/modules/merchant/profile/infrastructure/entities/profile-merchant.entity';

@Injectable()
export class MerchantRegisterUserUseCase {
  constructor(
    private readonly db: DatabaseService,
    private readonly usersFacade: UsersFacade,
    private readonly eventEmitter: EventEmitter2,
    private readonly hasher: Argon2PasswordHasher,
    private readonly issueTokens: IssueAuthTokensUseCase,
    private readonly tokenCrypto: TokenCryptoService,
    private readonly profileCreationResolver: AuthProfileCreationResolver,
  ) {}

  async execute(dto: MerchantRegisterDto, ip?: string, userAgent?: string) {
    const existingUser = await this.usersFacade.findByEmail(dto.email);

    // 🔐 domain rule
    RegistrationPolicy.ensureEmailIsUnique(existingUser);

    const response = await this.db.transaction(async (queryRunner) => {
      const hashedPassword = await this.hasher.hash(dto.password);

      const roles = dto.roles || ['merchant'];
      const formattedRoles = roles.map((r) => ({ name: r }));

      const user = await this.usersFacade.create(
        {
          name: dto.shopName,
          email: dto.email,
          roles: formattedRoles,
          password: hashedPassword,
          email_verified_at: undefined,
        },
        queryRunner,
      );

      // We explicitly resolve basic profile if need be (might be handled by merchant profile creation strategy)
      await this.profileCreationResolver.ensureProfile(user, queryRunner);

      // Now ensure we update the merchant profile with specific fields that were created by strategy, or create if it didn't
      let profile = await queryRunner.manager.findOne(ProfileMerchant, {
        where: { user_id: user.id }
      });

      if (profile) {
        profile.shopName = dto.shopName;
        profile.phone = dto.phone;
        await queryRunner.manager.save(ProfileMerchant, profile);
      } else {
        profile = queryRunner.manager.create(ProfileMerchant, {
          user: { id: user.id },
          user_id: user.id,
          shopName: dto.shopName,
          phone: dto.phone,
        });
        await queryRunner.manager.save(ProfileMerchant, profile);
      }

      // Instead of issuing tokens immediately (they need KYC or verification usually),
      // we just return user object but specs say 201 Created and return specific string.
      // Wait, spec for registration: Expected response with NO token, just merchantId, email, status.
      return { 
        merchantId: user.uid || user.id.toString(),
        email: user.email,
        status: profile.status
      };
    });

    this.sendEmail(response.email); // Fixed: response now contains email directly

    return response;
  }

  private sendEmail(email: string) {
    // We need the user to sign the token
    this.db.transaction(async (qr) => {
        const user = await this.usersFacade.findByEmail(email, qr);
        if (!user) return;

        const verification_token = this.tokenCrypto.signTemporaryToken({
            userId: user.id,
            email: user.email,
        });

        // 📢 domain event
        this.eventEmitter.emit(
            'auth.user.registered',
            new UserRegisteredEvent(
                user.id,
                user.email,
                user.name,
                verification_token,
                user.roles.map((r) => r.name),
            ),
        );
    });
  }
}
