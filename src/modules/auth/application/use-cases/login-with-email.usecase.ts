import { Injectable, UnauthorizedException } from '@nestjs/common';
import { LoginDto } from '../../api/dto';
import { UsersFacade } from '@/modules/users/application/users.facade';
import { AuthPolicy } from '../../domain/policies/auth.policy';
import { IssueAuthTokensUseCase } from './issue-auth-tokens.usecase';
@Injectable()
export class LoginWithEmailUseCase {
  constructor(
    private readonly usersFacade: UsersFacade,
    private readonly issueTokens: IssueAuthTokensUseCase,
    private readonly authPolicy: AuthPolicy,
  ) {}

  async execute(dto: LoginDto, ip?: string, userAgent?: string) {
    const user = await this.usersFacade.findByEmailWithPassword(dto.email);

    const isValidPassword = await this.authPolicy.verifyPassword(
      user,
      dto.password,
    );

    if (!user || !user.password || !isValidPassword) {
      throw new UnauthorizedException('Invalid email or password');
    }

    this.authPolicy.ensureEmailVerified(user);

    this.authPolicy.ensureHasRequiredRole(user, dto.requiredRole);

    const tokens = await this.issueTokens.execute(
      user,
      dto.requiredRole,
      ip,
      userAgent,
    );

    return { user, tokens };
  }
}
