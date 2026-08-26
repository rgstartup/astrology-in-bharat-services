import { Injectable } from '@nestjs/common';
import { QueryRunner } from 'typeorm';
import { User } from '@/modules/users/infrastructure/entities/user.entity';
import { AuthProfileCreationStrategy } from './auth-profile-creation.strategy';
import { RoleEnum } from '@/modules/users/infrastructure/enums/Role.enum';
import { ClientAccount } from '@/modules/client/account/entities/account.entity';
import crypto from 'node:crypto';

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

    const suffix = crypto
      .randomBytes(4)
      .toString('hex')
      .toUpperCase()
      .slice(0, 6);

    const account = clientAccountRepo.create({
      user,
      uid: `AIB-USR-${suffix}`,
      name: user.full_name || user.name,
      email: user.email,
      avatar: user.avatar,
    });

    return clientAccountRepo.save(account);
  }
}
