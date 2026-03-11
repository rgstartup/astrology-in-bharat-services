import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { DatabaseService } from '@/core/database/database.service';
import { UsersFacade } from '@/modules/users/application/users.facade';
import { UsedTokensService } from '../../infrastructure/persistence/services/used-tokens.service';
import { EmailVerificationPolicy } from '../../domain/policies/email-verification.policy';
import { TokenCryptoService } from '../../infrastructure/tokens/token-crypto.service';

@Injectable()
export class VerifyEmailUseCase {
  constructor(
    private readonly db: DatabaseService,
    private readonly usersFacade: UsersFacade,
    private readonly usedTokenService: UsedTokensService,
    private readonly tokenCrypto: TokenCryptoService,
  ) { }

  async execute(token: string) {
    const payload = await this.verifyTokenOrFail(token);

    const user = await this.usersFacade.findByEmail(payload.email);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    EmailVerificationPolicy.ensureEmailNotVerified(user);

    const isTokenUsed = await this.usedTokenService.isTokenUsed(token, user.id);

    EmailVerificationPolicy.ensureTokenNotUsed(isTokenUsed);

    await this.db.transaction(async (qr) => {
      return Promise.all([
        this.usersFacade.update(
          user.id,
          { email_verified_at: new Date() },
          qr,
        ),
        this.usedTokenService.markTokenAsUsed(
          token,
          user.id,
          'email_confirmation',
          qr,
        ),
      ]);
    });

    return {
      message: 'Email verified successfully',
    };
  }

  // 🔐 infra → application boundary
  private async verifyTokenOrFail(token: string) {
    try {
      return await this.tokenCrypto.verifyJwt<{ userId: number; email: string }>(token);
    } catch {
      throw new BadRequestException('Invalid or expired token');
    }
  }
}
