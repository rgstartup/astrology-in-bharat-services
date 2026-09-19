import { Injectable } from '@nestjs/common';
import { QueryRunner } from 'typeorm';
import { User } from '@/modules/users/entities/user.entity';
import { AuthProfileCreationStrategy } from './auth-profile-creation.strategy';
import { RoleEnum } from '@/modules/users/enums/Role.enum';
import { ClientAccount } from '@/modules/client/account/entities/account.entity';
import { nanoid } from 'nanoid';

@Injectable()
export class ClientAuthProfileCreationStrategy
  implements AuthProfileCreationStrategy<ClientAccount> {
  readonly role = RoleEnum.CLIENT;

  async ensureProfile(user: User, queryRunner: QueryRunner): Promise<ClientAccount> {
    const clientAccountRepo = queryRunner.manager.getRepository(ClientAccount);

    const existingAccount = await clientAccountRepo.findOne({
      where: { user: { id: user.id } },
    });
    if (existingAccount) return existingAccount;

    const account = clientAccountRepo.create({
      user,
      public_id: nanoid(12),
      name: user.full_name || user.name,
      email: user.email,
      avatar: user.avatar,
      avatar_id: user.avatar_id,
    });

    return clientAccountRepo.save(account);
  }
}
