import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { ClientAccount } from '../entities/account.entity';

@Injectable()
export class GetAccountUseCase {
  constructor(
    @InjectRepository(ClientAccount)
    private readonly accountRepo: Repository<ClientAccount>,
  ) {}

  async execute(
    client: ClientAccount | { id: string },
    queryRunner?: QueryRunner,
  ): Promise<ClientAccount | null> {
    const repo = queryRunner
      ? queryRunner.manager.getRepository(ClientAccount)
      : this.accountRepo;

    const data = await repo.findOne({
      where: { id: client.id },
      // relations: ['addresses'],
    });

    console.log(data);

    return data;
  }
}
