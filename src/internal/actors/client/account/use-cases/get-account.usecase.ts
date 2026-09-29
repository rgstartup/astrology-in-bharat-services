import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../../../../../core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '../../../../../core/drizzledb/drizzle.types';
import {
  addresses,
  clientAccounts,
  media,
  users,
} from '../../../../../core/drizzledb/schema';
import {
  toClientAccountResponse,
  type ClientAccountDetails,
  type SafeUserRow,
} from '../account.mapper';
import type { ClientAccount } from '../entities/account.entity';

@Injectable()
export class GetAccountUseCase {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async execute(
    client: ClientAccount | { id: number | string },
  ): Promise<ClientAccountDetails | null> {
    const accountId = Number(client.id);

    let [account] = await this.db
      .select()
      .from(clientAccounts)
      .where(eq(clientAccounts.id, accountId))
      .limit(1);

    // Fall back to a user_id lookup: some callers pass the user id
    // (e.g. admin expert-detail passes `{ id: user.id }`).
    if (!account) {
      [account] = await this.db
        .select()
        .from(clientAccounts)
        .where(eq(clientAccounts.user_id, accountId))
        .limit(1);
    }

    if (!account) return null;

    const [[user], [avatar_media], accountAddresses] = await Promise.all([
      this.db
        .select({
          id: users.id,
          user_group_id: users.user_group_id,
          email: users.email,
          email_verified_at: users.email_verified_at,
          first_name: users.first_name,
          last_name: users.last_name,
          name: users.name,
          full_name: users.full_name,
          avatar: users.avatar,
          avatar_id: users.avatar_id,
          is_blocked: users.is_blocked,
          blocked_by_id: users.blocked_by_id,
          blocked_by_name: users.blocked_by_name,
          blocked_at: users.blocked_at,
          role: users.role,
          platform: users.platform,
          admin_permissions: users.admin_permissions,
          referred_by_id: users.referred_by_id,
          created_at: users.created_at,
          updated_at: users.updated_at,
        })
        .from(users)
        .where(eq(users.id, account.user_id))
        .limit(1),
      account.avatar_id
        ? this.db
            .select()
            .from(media)
            .where(eq(media.id, account.avatar_id))
            .limit(1)
            .then(([row]) => [row ?? null])
        : Promise.resolve([null]),
      this.db
        .select()
        .from(addresses)
        .where(eq(addresses.client_account_id, account.id)),
    ]);

    return {
      ...toClientAccountResponse(account),
      user: (user ?? null) as SafeUserRow | null,
      avatar_media: avatar_media ?? null,
      addresses: accountAddresses,
    };
  }
}
