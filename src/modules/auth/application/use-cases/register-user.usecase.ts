
import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { RegisterDto } from '../../api/dto';
import { RegistrationPolicy } from '../../domain/policies/registration.policy';
import { DatabaseService } from '@/core/database/database.service';
import { TokenCryptoService } from '../../infrastructure/tokens/token-crypto.service';
import { IssueAuthTokensUseCase } from './issue-auth-tokens.usecase';
import { UsersFacade } from '@/modules/users/application/users.facade';
import { UserRegisteredEvent } from '../../domain/events/user-registered.event';
import { User } from '@/modules/users/infrastructure/entities/user.entity';
import { AuthProfileCreationResolver } from '../strategies/create-profile/auth-profile-creation.resolver';
import { WalletFacade } from '@/modules/wallet/application/wallet.facade';
import { ProfileExpert } from '@/modules/expert/profile/infrastructure/entities/profile-expert.entity';
import { hasRoles, RoleEnum } from '@/modules/users/infrastructure/enums/Role.enum';
import { IHasherToken, IHasher } from '@/common/contracts/hasher.contract';

@Injectable()
export class RegisterUserUseCase {
  constructor(
    private readonly db: DatabaseService,
    private readonly usersFacade: UsersFacade,
    private readonly eventEmitter: EventEmitter2,
    @Inject(IHasherToken) private readonly hasher: IHasher,
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

      const user = await this.usersFacade.create(
        {
          ...dto,
          roles: dto.roles,
          password: hashedPassword,
          email_verified_at: undefined,
        },
        queryRunner,
      );

      await this.profileCreationResolver.ensureProfile(user, queryRunner);

      // Lock Commission Rate for Experts if referred by an Agent
      if (hasRoles(dto.roles, 'EXPERT') && user.referred_by_id) {
        const agentCommissionRate = await this.walletFacade.getAdminCommissionFromSetting('COMMISION_FROM_ASTROLOGER');
        await queryRunner.manager.update(ProfileExpert, { user: { id: user.id } }, {
          agent_commission_rate: agentCommissionRate
        });
      }

      const tokens = await this.issueTokens.execute(
        user,
        dto.roles[0] as RoleEnum,
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


    // 📢 domain event
    this.eventEmitter.emit(
      'auth.user.registered',
      new UserRegisteredEvent(
        user.id,
        user.email,
        user.name || 'user',
        user.roles,
        verification_token,
      ),
    );
  }
}
