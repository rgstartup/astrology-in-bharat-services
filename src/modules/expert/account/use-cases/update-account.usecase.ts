import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IExpert } from '@/common/types/access-token.payload';
import { User } from '@/modules/users/infrastructure/entities/user.entity';
import { ExpertAccount } from '../entities/account.entity';
import { UpdateExpertAccountDto } from '../dto/account.dto';

@Injectable()
export class UpdateExpertAccountUseCase {
  constructor(
    @InjectRepository(ExpertAccount)
    private readonly accounts: Repository<ExpertAccount>,
  ) {}

  async execute(expert: IExpert, dto: UpdateExpertAccountDto) {
    const account = await this.accounts.findOneOrFail({
      where: { id: expert.sub },
      relations: { user: true },
    });
    const { full_name, ...fields } = dto;
    Object.assign(account, fields);
    if (full_name !== undefined) {
      account.name = full_name;
      account.user.full_name = full_name;
      account.user.name = full_name;
    }
    if (dto.avatar !== undefined) {
      account.avatar = dto.avatar;
      account.user.avatar = dto.avatar;
    }
    await this.accounts.manager.save(User, account.user);
    return this.accounts.save(account);
  }
}
