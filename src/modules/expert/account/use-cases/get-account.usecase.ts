import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IExpert } from '@/common/types/access-token.payload';
import { ExpertAccount } from '../entities/account.entity';

@Injectable()
export class GetExpertAccountUseCase {
  constructor(
    @InjectRepository(ExpertAccount)
    private readonly accounts: Repository<ExpertAccount>,
  ) {}

  execute(expert: IExpert) {
    return this.accounts.findOne({
      where: { id: expert.sub },
    });
  }
}
