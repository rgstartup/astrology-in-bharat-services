import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { ClientAccount } from '../entities/account.entity';
import { CreateClientAccountDto } from '../dto/account.dto';
import { User } from '@/modules/users/entities/user.entity';
import { nanoid } from 'nanoid';
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
    userId: number | string,
    dto: CreateClientAccountDto,
    queryRunner?: QueryRunner,
  ): Promise<ClientAccount> {
    const repo = this.getRepo(queryRunner);

    const existingAccount = await repo.findOne({
      where: { user: { id: Number(userId) } },
    });

    if (existingAccount) return existingAccount;

    const account = repo.create();
    Object.assign(account, dto);
    account.user = { id: Number(userId) } as User;
    account.public_id = nanoid(12);

    return repo.save(account);
  }
}
