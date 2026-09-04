import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientAccount } from '@/modules/client/account/entities/account.entity';
import { RoleEnum } from '@/modules/users/infrastructure/enums/Role.enum';
import { IFindProfileStrategy } from './find-profile.strategy';

@Injectable()
export class ClientFindProfileStrategy implements IFindProfileStrategy {
  constructor(
    @InjectRepository(ClientAccount)
    private readonly accountRepo: Repository<ClientAccount>,
  ) {}

  supports(role: RoleEnum): boolean {
    return role === RoleEnum.CLIENT;
  }

  async findProfile(userId: string): Promise<string | null> {
    const account = await this.accountRepo.findOne({
      where: { user: { id: userId } },
      select: ['id'],
    });
    return account?.id ?? null;
  }
}
