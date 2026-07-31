import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { RegisterDto } from '../../api/dto';
import { RegistrationPolicy } from '../../domain/policies/registration.policy';
import { DatabaseService } from '@/core/database/database.service';
import { TokenCryptoService } from '../../infrastructure/tokens/token-crypto.service';
import { AuthTokenService } from '../services/auth-token.service';
import { UserRegisteredEvent } from '../../domain/events/user-registered.event';
import { User } from '@/modules/users/infrastructure/entities/user.entity';
import { AuthProfileCreationResolver } from '../strategies/create-profile/auth-profile-creation.resolver';
import { ProfileExpert } from '@/modules/expert/profile/infrastructure/entities/profile-expert.entity';
import { SystemSetting } from '@/modules/admin/infrastructure/entities/system-setting.entity';
import { hasRoles } from '@/modules/users/infrastructure/enums/Role.enum';
import { IHasherToken, IHasher } from '@/common/contracts/hasher.contract';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class RegisterUserUseCase {
  constructor(
    private readonly db: DatabaseService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly eventEmitter: EventEmitter2,
    @Inject(IHasherToken) private readonly hasher: IHasher,
    private readonly authTokenService: AuthTokenService,
    private readonly tokenCrypto: TokenCryptoService,
    private readonly profileCreationResolver: AuthProfileCreationResolver,
  ) {}

  async execute(dto: RegisterDto, ip?: string, userAgent?: string) {
    const response = await this.db.transaction(async (queryRunner) => {
      // 1. Check for existing user WITHIN the transaction
      const existingUser = await queryRunner.manager.findOne(User, {
        where: { email: dto.email },
      });

      // 🔐 domain rule (Atomic check)
      RegistrationPolicy.ensureEmailIsUnique(existingUser);

      const hashedPassword = await this.hasher.hash(dto.password);

      const newUser = queryRunner.manager.create(User, {
        ...dto,
        roles: dto.roles,
        password: hashedPassword,
        email_verified_at: undefined,
      });

      const user = await queryRunner.manager.save(User, newUser);

      await this.profileCreationResolver.ensureProfile(user, queryRunner);

      // Lock Commission Rate for Experts if referred by an Agent
      if (hasRoles(dto.roles, 'EXPERT') && user.referred_by_id) {
        const setting = await queryRunner.manager.findOne(SystemSetting, {
          where: { key: 'COMMISION_FROM_ASTROLOGER' },
        });
        const agentCommissionRate = setting?.value
          ? parseFloat(setting.value)
          : 0;

        await queryRunner.manager.update(
          ProfileExpert,
          { user_id: user.id },
          { agent_commission_rate: agentCommissionRate },
        );
      }

      const tokens = await this.authTokenService.issueAuthTokens(
        user,
        dto.roles[0],
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
