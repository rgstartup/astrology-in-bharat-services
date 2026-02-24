import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { DatabaseService } from '@/core/database/database.service';
import { UsersFacade } from '@/modules/users/application/users.facade';
import { UsedTokensService } from '../../infrastructure/persistence/services/used-tokens.service';
import { TokenCryptoService } from '../../infrastructure/tokens/token-crypto.service';
import { LoginWithMagicLinkPolicy } from '../../domain/policies/login-with-magic-link.policy';
import { IssueAuthTokensUseCase } from './issue-auth-tokens.usecase';

@Injectable()
export class LoginWithMagicLinkUseCase {
  constructor(
    private readonly db: DatabaseService,
    private readonly usersFacade: UsersFacade,
    private readonly usedTokenService: UsedTokensService,
    private readonly tokenCrypto: TokenCryptoService,
    private readonly issueAuthTokens: IssueAuthTokensUseCase,
  ) {}

  async execute(token: string, ip?: string, ua?: string) {
    const payload = await this.verifyTokenOrFail(token);

    const user = await this.usersFacade.findByEmail(payload.email);

    if (!user) {
      throw new UnauthorizedException("User not found or doesn't exist");
    }

    const isTokenUsed = await this.usedTokenService.isTokenUsed(token, user.id);

    LoginWithMagicLinkPolicy.ensureTokenIsUnused(isTokenUsed);

    await this.db.transaction(async (qr) => {
      return Promise.all([
        user.isVerified()
          ? Promise.resolve(user)
          : this.usersFacade.update(
              user.id,
              { email_verified_at: new Date() },
              qr,
            ),

        this.usedTokenService.markTokenAsUsed(
          token,
          user.id,
          'magic link verification',
          qr,
        ),
      ]);
    });

    const tokens = await this.issueAuthTokens.execute(user, ip, ua);

    return tokens;
  }

  // 🔐 infra → application boundary
  private verifyTokenOrFail(token: string) {
    try {
      return this.tokenCrypto.verifyJwt<{ sub: number; email: string }>(token);
    } catch {
      throw new BadRequestException('Invalid or expired token');
    }
  }
}
