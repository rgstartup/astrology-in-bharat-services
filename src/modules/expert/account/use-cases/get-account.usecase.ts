import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IUser } from '@/common/types/access-token.payload';
import { ExpertAccount } from '../entities/account.entity';

@Injectable()
export class GetExpertAccountUseCase {
  constructor(
    @InjectRepository(ExpertAccount)
    private readonly accounts: Repository<ExpertAccount>,
  ) {}

  execute(user: IUser) {
    return this.accounts.findOne({
      where: { user_id: user.id },
      relations: { user: true },
    });
  }
}
