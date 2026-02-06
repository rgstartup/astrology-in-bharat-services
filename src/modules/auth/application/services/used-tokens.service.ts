import { Injectable, Inject } from '@nestjs/common';
import { createHash } from 'crypto';
import { IUsedTokenRepository } from '../../domain/repositories/used-token.repository.interface';

@Injectable()
export class UsedTokensService {
  constructor(
    @Inject(IUsedTokenRepository)
    private readonly usedTokensRepo: IUsedTokenRepository,
  ) { }

  async findOne(token: string, userId: number) {
    const hashedToken = createHash('sha256').update(token).digest('hex');

    return this.usedTokensRepo.findOne({
      where: {
        user: {
          id: userId,
        },
        token: hashedToken,
      },
    });
  }

  async addUsedToken(token: string, userId: number, purpose?: string) {
    const tokenEntry = this.usedTokensRepo.create({
      user: {
        id: userId,
      } as any,
      token,
      purpose,
    });

    return this.usedTokensRepo.save(tokenEntry);
  }
}
