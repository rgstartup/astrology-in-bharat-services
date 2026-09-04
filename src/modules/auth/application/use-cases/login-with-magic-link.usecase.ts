import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { DatabaseService } from '@/core/database/database.service';
import { UsedTokensService } from '../../infrastructure/services/used-tokens.service';
import { TokenCryptoService } from '../../infrastructure/tokens/token-crypto.service';
import { LoginWithMagicLinkPolicy } from '../../domain/policies/login-with-magic-link.policy';
import { AuthTokenService } from '../services/auth-token.service';
import { RoleEnum } from '@/modules/users/infrastructure/enums/Role.enum';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '@/modules/users/infrastructure/entities/user.entity';

@Injectable()
export class LoginWithMagicLinkUseCase {
  constructor(
    private readonly db: DatabaseService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly usedTokenService: UsedTokensService,
    private readonly tokenCrypto: TokenCryptoService,
    private readonly authTokenService: AuthTokenService,
  ) {}

  async execute(token: string, role: RoleEnum, ip?: string, ua?: string) {
    const payload = await this.verifyTokenOrFail(token);

    const user = await this.userRepository.findOne({
      where: { email: payload.email },
    });

    if (!user) {
      throw new UnauthorizedException("User not found or doesn't exist");
    }

    const isTokenUsed = await this.usedTokenService.isTokenUsed(token, user.id);

    LoginWithMagicLinkPolicy.ensureTokenIsUnused(isTokenUsed);

    const [updatedUser] = await this.db.transaction(async (qr) => {
      return Promise.all([
        user.isVerified()
          ? Promise.resolve(user)
          : qr.manager.save(User, { ...user, email_verified_at: new Date() }),

        this.usedTokenService.markTokenAsUsed(
          token,
          user.id,
          'magic link verification',
          qr,
        ),
      ]);
    });

    const tokens = await this.authTokenService.issueAuthTokens(
      user,
      role,
      ip,
      ua,
    );

    return { user: updatedUser, tokens };
  }

  // 🔐 infra → application boundary
  private verifyTokenOrFail(token: string) {
    try {
      return this.tokenCrypto.verifyJwt<{ userId: string; email: string }>(
        token,
      );
    } catch {
      throw new BadRequestException('Invalid or expired token');
    }
  }
}
