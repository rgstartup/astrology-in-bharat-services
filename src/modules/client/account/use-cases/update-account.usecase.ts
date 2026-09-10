import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import { BooleanMessage } from '@/common/dto/boolean-message.dto';
import { User } from '@/modules/users/infrastructure/entities/user.entity';
import { Address, AddressTag } from '@/common/address/address.entity';

import { ClientAccount } from '../entities/account.entity';
import { UpdateClientAccountDto } from '../dto/account.dto';
import { DatabaseService } from '@/core/database/database.service';

@Injectable()
export class UpdateAccountUseCase {
  private readonly logger = new Logger(UpdateAccountUseCase.name);

  constructor(private readonly db: DatabaseService) {}

  async execute(
    client: ClientAccount | { id: string },
    dto: UpdateClientAccountDto,
  ) {
    await this.db.transaction(async (queryRunner) => {
      const account = await queryRunner.manager.findOne(ClientAccount, {
        where: { id: client.id },
        relations: ['user', 'addresses'],
      });

      if (!account) {
        throw new NotFoundException('Client account not found');
      }

      const { full_name, addresses, ...scalarFields } =
        dto as UpdateClientAccountDto & {
          full_name?: string;
          addresses?: Record<string, unknown>[];
        };

      // Sync name in User table if provided
      if (full_name !== undefined) {
        account.name = full_name;
        if (account.user?.id) {
          await queryRunner.manager.update(
            User,
            { id: account.user.id },
            { full_name, name: full_name },
          );
        }
      }

      // Sync avatar in User table if provided
      const fields = scalarFields as Record<string, unknown>;
      if (fields.avatar !== undefined) {
        if (account.user?.id) {
          await queryRunner.manager.update(
            User,
            { id: account.user.id },
            { avatar: fields.avatar as string },
          );
        }
      }

      // Apply scalar fields to the account
      Object.assign(account, scalarFields);

      // Handle addresses update (cascade)
      if (addresses !== undefined && Array.isArray(addresses)) {
        if (account.addresses && account.addresses.length > 0) {
          await queryRunner.manager.remove(Address, account.addresses);
        }
        account.addresses = addresses.map((addr) => {
          const addrData: Partial<Address> = {
            line1:
              [addr.line1, addr.line2].filter(Boolean).join(', ') ||
              (addr.house_no as string) ||
              '',
            house_no: addr.house_no,
            city: addr.city,
            district: addr.district,
            state: addr.state,
            country: addr.country,
            zip_code: addr.zip_code || addr.pincode || '',
            pincode: addr.pincode,
            is_primary: addr.is_primary ?? false,
            tag: addr.tag || AddressTag.OTHER,
            client_account: account,
          };
          return queryRunner.manager.create(Address, addrData);
        });
      }

      await queryRunner.manager.save(ClientAccount, account);
    });

    return new BooleanMessage(true, 'Account updated successfully');
  }
}
