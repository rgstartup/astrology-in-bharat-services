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

@Injectable()
export class RegisterUserUseCase {
  constructor(
    private readonly db: DatabaseService,
    private readonly usersFacade: UsersFacade,
    private readonly eventEmitter: EventEmitter2,
    private readonly hasher: Argon2PasswordHasher,
    private readonly issueTokens: IssueAuthTokensUseCase,
    private readonly tokenCrypto: TokenCryptoService,
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
        },
        queryRunner,
      );

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
