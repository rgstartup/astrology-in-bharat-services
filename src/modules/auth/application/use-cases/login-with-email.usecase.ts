import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { LoginDto } from '../../api/dto';
import { UsersFacade } from '@/modules/users/application/users.facade';
import { Argon2PasswordHasher } from '../../infrastructure/hashing/argon2-password.hasher';
import { User } from '@/modules/users/infrastructure/entities/user.entity';
import { InvalidCredentialsError } from '../../domain/errors/invalid-credentials.error';
import { AuthPolicy } from '../../domain/policies/auth.policy';
import { IssueAuthTokensUseCase } from './issue-auth-tokens.usecase';

@Injectable()
export class LoginWithEmailUseCase {
  constructor(
    private readonly usersFacade: UsersFacade,
    private passwordHasher: Argon2PasswordHasher,
    private readonly issueTokens: IssueAuthTokensUseCase,
  ) {}

  async execute(dto: LoginDto, ip?: string, userAgent?: string) {
    const user = await this.usersFacade.findByEmailWithPassword(dto.email);

    if (!user) {
      throw new UnauthorizedException('User not found with this email. Please sign up first.');
    }

    const isValidPassword = await this.validatePassword(dto, user);

    if (!isValidPassword) {
      throw new UnauthorizedException('Invalid password. Please try again.');
    }

    // Role Validation: Move logic to backend
    if (dto.requiredRole) {
      const hasRequiredRole = user.roles?.some(role => 
        role.name.toLowerCase() === dto.requiredRole?.toLowerCase()
      );

      if (!hasRequiredRole) {
        throw new ForbiddenException(`Aapke paas ${dto.requiredRole} access nahi hai. Kripya sahi dashboard se login karein.`);
      }
    }

    AuthPolicy.ensureCanLogin(user);

    const tokens = await this.issueTokens.execute(user, ip, userAgent);

    return { user, tokens };
  }

  private async validatePassword(dto: LoginDto, user?: User | null) {
    const fallbackInvalidPassword = await this.passwordHasher.hash(
      'fallbackInvalidPassword',
    );

    const isValid = await this.passwordHasher.verify(
      user?.password ?? fallbackInvalidPassword,
      dto.password,
    );

    return isValid;
  }
}
