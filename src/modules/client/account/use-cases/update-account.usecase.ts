import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { BooleanMessage } from '@/common/dto/boolean-message.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ClientAccount } from '../entities/account.entity';
import { UpdateClientAccountDto } from '../dto/account.dto';
import { User } from '@/modules/users/infrastructure/entities/user.entity';
import { IUser } from '@/common/types/access-token.payload';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Address, AddressTag } from '@/common/address/address.entity';

@Injectable()
export class UpdateAccountUseCase {
  private readonly logger = new Logger(UpdateAccountUseCase.name);

  constructor(
    @InjectRepository(ClientAccount)
    private readonly repo: Repository<ClientAccount>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Address)
    private readonly addressRepo: Repository<Address>,
    private readonly dataSource: DataSource,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(client: ClientAccount | { id: string }, dto: UpdateClientAccountDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const identifier = client.id;

      let account = await queryRunner.manager.findOne(ClientAccount, {
        where: [{ id: identifier }, { user: { id: identifier } }],
        relations: ['user', 'addresses'],
      });

      if (!account) {
        this.logger.log(
          `No client account found for ${identifier}, creating on-the-fly`,
        );
        account = queryRunner.manager.create(ClientAccount, {
          user: { id: identifier } as unknown as User,
          gender: 'other',
        });
        await queryRunner.manager.save(ClientAccount, account);
        account = await queryRunner.manager.findOne(ClientAccount, {
          where: [{ id: identifier }, { user: { id: identifier } }],
          relations: ['user', 'addresses'],
        });
      }

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
            house_no: addr.house_no as string | undefined,
            city: addr.city as string | undefined,
            district: addr.district as string | undefined,
            state: addr.state as string | undefined,
            country: addr.country as string | undefined,
            zip_code:
              (addr.zip_code as string | undefined) ||
              (addr.pincode as string | undefined) ||
              '',
            pincode: addr.pincode as string | undefined,
            is_primary: (addr.is_primary as boolean) ?? false,
            tag: (addr.tag as AddressTag) || AddressTag.OTHER,
            client_account: account,
          };
          return queryRunner.manager.create(Address, addrData);
        });
      }

      const updatedAccount = await queryRunner.manager.save(
        ClientAccount,
        account,
      );

      await queryRunner.commitTransaction();

      this.eventEmitter.emit('client.account.updated', {
        userId: account.user?.id || account.id,
        accountId: updatedAccount.id,
        payload: dto,
      });

      return new BooleanMessage(true, 'Account updated successfully');
    } catch (err) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
