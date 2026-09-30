import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import {
  addresses,
  clientAccounts,
  media,
  clientWallets,
} from '@/core/drizzledb/schema';
import type { ClientAccountDetails } from '../account.mapper';

@Injectable()
export class GetAccountUseCase {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async execute(
    accountId: number
  ): Promise<ClientAccountDetails | null> {

    const [[result], accountAddresses] = await Promise.all([
      this.db
        .select({
          account: {
            id: clientAccounts.id,
            email: clientAccounts.email,
            first_name: clientAccounts.first_name,
            last_name: clientAccounts.last_name,
            full_name: clientAccounts.name,
            public_id: clientAccounts.public_id,
            is_blocked: clientAccounts.is_blocked,
            date_of_birth: clientAccounts.date_of_birth,
            time_of_birth: clientAccounts.time_of_birth,
            place_of_birth: clientAccounts.place_of_birth,
            marital_status: clientAccounts.marital_status,
            occupation: clientAccounts.occupation,
            about_me: clientAccounts.about_me,
            status: clientAccounts.status,
            preferences: clientAccounts.preferences,
            gender: clientAccounts.gender,
            phone: clientAccounts.phone,
            phone_verified_at: clientAccounts.phone_verified_at,
            created_at: clientAccounts.created_at,
            updated_at: clientAccounts.updated_at,
          },
          avatar_media: {
            id: media.id,
            public_id: media.public_id,
            url: media.url,
          },
          wallet: {
            balance: clientWallets.balance,
          },
        })
        .from(clientAccounts)
        .leftJoin(media, eq(media.id, clientAccounts.avatar_id))
        .leftJoin(clientWallets, eq(clientWallets.client_id, clientAccounts.id))
        .where(eq(clientAccounts.id, accountId))
        .limit(1),
     
     //fetch addreses for the account
        this.db
        .select()
        .from(addresses)
        .where(eq(addresses.client_account_id, accountId)),
    ]);

    if (!result) return null;

    return {
      ...result.account,
      avatar_media: result.avatar_media,
      wallet: {
        balance: Number(result.wallet?.balance ?? 0),
      },
      addresses: accountAddresses,
    };
  }
}
