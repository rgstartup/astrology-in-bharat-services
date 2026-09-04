import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { ClientAccount } from '../entities/account.entity';
import { CreateClientAccountDto } from '../dto/account.dto';
import { User } from '@/modules/users/infrastructure/entities/user.entity';
import crypto from 'node:crypto';
import { BaseService } from '@/common/services/transaction.service';

@Injectable()
export class CreateAccountUseCase extends BaseService<ClientAccount> {
  constructor(
    @InjectRepository(ClientAccount)
    private readonly accountRepo: Repository<ClientAccount>,
  ) {
    super(accountRepo);
  }

  async execute(
    userId: string,
    dto: CreateClientAccountDto,
    queryRunner?: QueryRunner,
  ): Promise<ClientAccount> {
    const repo = this.getRepo(queryRunner);

    const existingAccount = await repo.findOne({
      where: { user: { id: userId } },
    });

    if (existingAccount) return existingAccount;

    const account = repo.create();
    Object.assign(account, dto);
    account.user = { id: userId } as User;

    const suffix = crypto
      .randomBytes(4)
      .toString('hex')
      .toUpperCase()
      .slice(0, 6);
    account.uid = `AIB-USR-${suffix}`;

    return repo.save(account);
  }
}
