// @ts-nocheck
import { InjectRepository } from '@nestjs/typeorm';
import { UsedTokens } from '../entities/used-tokens.entity';
import { QueryRunner, Repository } from 'typeorm';
import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { BaseService } from '@/common/services/transaction.service';

@Injectable()
export class UsedTokensService extends BaseService<UsedTokens> {
  constructor(
    @InjectRepository(UsedTokens)
    private readonly usedTokensRepo: Repository<UsedTokens>,
  ) {
    super(usedTokensRepo);
  }

  async isTokenUsed(token: string, userId: string) {
    const hashedToken = createHash('sha256').update(token).digest('hex');

    return this.usedTokensRepo.exists({
      where: {
        user: {
          id: userId,
        },
        token: hashedToken,
      },
    });
  }

  async markTokenAsUsed(
    token: string,
    userId: string,
    purpose?: string,
    qr?: QueryRunner,
  ) {
    const repo = this.getRepo(qr);

    const tokenEntry = repo.create({
      user: {
        id: userId,
      },
      token,
      purpose,
    });

    return repo.save(tokenEntry);
  }
}
