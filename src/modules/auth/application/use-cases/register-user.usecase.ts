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
import { ClientProfileFacade } from '@/modules/client/profile/application/profile.facade';
import { ExpertProfileFacade } from '@/modules/expert/profile/application/profile.facade';

@Injectable()
export class RegisterUserUseCase {
  constructor(
    private readonly db: DatabaseService,
    private readonly usersFacade: UsersFacade,
    private readonly eventEmitter: EventEmitter2,
    private readonly hasher: Argon2PasswordHasher,
    private readonly issueTokens: IssueAuthTokensUseCase,
    private readonly tokenCrypto: TokenCryptoService,
    private readonly clientProfileFacade: ClientProfileFacade,
    private readonly expertProfileFacade: ExpertProfileFacade,
  ) { }

  async execute(dto: RegisterDto, ip?: string, userAgent?: string) {
    const existingUser = await this.usersFacade.findByEmail(dto.email);

    // 🔐 domain rule
    RegistrationPolicy.ensureEmailIsUnique(existingUser);

    const response = await this.db.transaction(async (queryRunner) => {
      const hashedPassword = await this.hasher.hash(dto.password);

      const formattedRoles = dto.roles.map((r) => ({ name: r }));

      const user = await this.usersFacade.create(
        {
          ...dto,
          roles: formattedRoles,
          password: hashedPassword,
          email_verified_at: process.env.NODE_ENV !== 'production' ? new Date() : undefined,
        },
        queryRunner,
      );

      // Auto-create profile
      const roleNames = dto.roles;
      if (roleNames.includes('expert')) {
        await this.expertProfileFacade.createProfile(user, {
          full_name: user.name || '',
          phone_number: dto.phone,
        } as any, queryRunner);
      } else {
        await this.clientProfileFacade.createProfile(user.id, {
          full_name: user.name || '',
          phone: dto.phone,
        } as any, queryRunner);
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
    const verification_token = this.tokenCrypto.signTemporaryToken({
      userId: response.user.id,
      email: response.user.email,
    });

    // 📢 domain event
    this.eventEmitter.emit(
      'auth.user.registered',
      new UserRegisteredEvent(
        response.user.id,
        response.user.email,
        response.user.name,
        verification_token,
      ),
    );
  }
}
