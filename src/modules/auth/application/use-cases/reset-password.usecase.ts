import { UsersFacade } from '@/modules/users/application/users.facade';
import { TokenCryptoService } from '../../infrastructure/tokens/token-crypto.service';
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { UsedTokensService } from '../../infrastructure/services/used-tokens.service';
import { User } from '@/modules/users/infrastructure/entities/user.entity';
import { TokenAlreadyUsedError } from '../../domain/errors/token-already-used.error';
import { IHasher, IHasherToken } from '@/common/contracts/hasher.contract';

@Injectable()
export class ResetPasswordUseCase {
  constructor(
    private readonly usersFacade: UsersFacade,
    private readonly tokenCrypto: TokenCryptoService,
    private readonly usedTokenService: UsedTokensService,
    @Inject(IHasherToken) private readonly hasher: IHasher,
  ) {}

  async execute(token: string, password: string) {
    const payload = await this.verifyTokenOrFail(token);

    const existingUser = await this.usersFacade.findByEmail(payload.email);

    if (!existingUser) {
      throw new BadRequestException("User not found or doesn't exist");
    }

    const isTokenUsedAlready = await this.usedTokenService.isTokenUsed(
      token,
      existingUser.id,
    );

    if (isTokenUsedAlready) throw new TokenAlreadyUsedError();

    await this.updatePassword(password, existingUser);

    await this.usedTokenService.markTokenAsUsed(
      token,
      existingUser.id,
      'password reset',
    );

    return {
      message: 'Password updated successfully!',
    };
  }

  // 🔐 infra → application boundary
  private verifyTokenOrFail(token: string) {
    try {
      return this.tokenCrypto.verifyJwt<{ email: string }>(token);
    } catch {
      throw new BadRequestException('Invalid or expired token');
    }
  }

  private async updatePassword(password: string, user: User) {
    const hashed = await this.hasher.hash(password);

    await this.usersFacade.update(user.id, {
      password: hashed,
    });
  }
}
