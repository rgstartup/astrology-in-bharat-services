import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { RegisterDto } from '../../api/dto';
import { RegistrationPolicy } from '../../domain/policies/registration.policy';
import { DatabaseService } from '@/core/database/database.service';
import { Argon2PasswordHasher } from '../../infrastructure/hashing/argon2-password.hasher';
import { TokenCryptoService } from '../../infrastructure/tokens/token-crypto.service';
import { IssueAuthTokensUseCase } from './issue-auth-tokens.usecase';
import { UsersFacade } from '@/modules/users/application/users.facade';
import { UserRegisteredEvent } from '../../domain/events/user-registered.event';
import { User } from '@/modules/users/infrastructure/persistence/entities/user.entity';
import { AuthProfileCreationResolver } from '../strategies/auth-profile-creation.resolver';
import { WalletFacade } from '@/modules/wallet/application/wallet.facade';
import { ProfileExpert } from '@/modules/expert/profile/infrastructure/persistence/entities/profile-expert.entity';

@Injectable()
export class RegisterUserUseCase {
  constructor(
    private readonly db: DatabaseService,
    private readonly usersFacade: UsersFacade,
    private readonly eventEmitter: EventEmitter2,
    private readonly hasher: Argon2PasswordHasher,
    private readonly issueTokens: IssueAuthTokensUseCase,
    private readonly tokenCrypto: TokenCryptoService,
    private readonly profileCreationResolver: AuthProfileCreationResolver,
    private readonly walletFacade: WalletFacade,
  ) {}

  async execute(dto: RegisterDto, ip?: string, userAgent?: string) {
    const response = await this.db.transaction(async (queryRunner) => {
      // 1. Check for existing user WITHIN the transaction
      const existingUser = await this.usersFacade.findByEmail(dto.email, queryRunner);

      // 🔐 domain rule (Atomic check)
      RegistrationPolicy.ensureEmailIsUnique(existingUser);

      const hashedPassword = await this.hasher.hash(dto.password);

      const formattedRoles = dto.roles.map((r) => ({ name: r }));

      const user = await this.usersFacade.create(
        {
          ...dto,
          roles: formattedRoles,
          password: hashedPassword,
          email_verified_at: undefined,
        },
        queryRunner,
      );

      await this.profileCreationResolver.ensureProfile(user, queryRunner);

      // Lock Commission Rate for Experts if referred by an Agent
      if (dto.roles.includes('expert') && user.referred_by_id) {
        const agentCommissionRate = await this.walletFacade.getAdminCommissionFromSetting('COMMISION_FROM_ASTROLOGER');
        await queryRunner.manager.update(ProfileExpert, { user: { id: user.id } }, {
          agent_commission_rate: agentCommissionRate
        });
      }

      const tokens = await this.issueTokens.execute(
        user,
        ip,
        userAgent,
        queryRunner,
      );

      return { user, tokens };
    });

    this.sendEmail(response);

    return response;
  }

  private sendEmail<T extends { user: User }>(response: T) {
    const { user } = response;
    const verification_token = this.tokenCrypto.signTemporaryToken({
      userId: user.id,
      email: user.email,
    });

    // Extract role names from user.roles if populated, otherwise use empty array
    const roleNames = user.roles ? user.roles.map((r) => r.name) : [];

    // 📢 domain event
    this.eventEmitter.emit(
      'auth.user.registered',
      new UserRegisteredEvent(
        user.id,
        user.email,
        user.name,
        verification_token,
        roleNames,
      ),
    );
  }
}
