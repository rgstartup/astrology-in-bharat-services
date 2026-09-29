import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../../../../../core/drizzledb/drizzle.constants';
import type {
  DrizzleDb,
  DrizzleTx,
} from '../../../../../core/drizzledb/drizzle.types';
import {
  addresses,
  clientAccounts,
  users,
  type ClientAccountRow,
} from '../../../../../core/drizzledb/schema';
import { BooleanMessage } from '../../../../../shared/dto/boolean-message.dto';
import { UpdateClientAccountDto } from '../dto/account.dto';
import type { ClientAccount } from '../entities/account.entity';
import { AddressType, AddressTag } from '../../../../../core/enums';

type AddressInput = {
  line1?: string;
  line2?: string;
  house_no?: string;
  city?: string;
  district?: string;
  state?: string;
  country?: string;
  zip_code?: string;
  pincode?: string;
  is_primary?: boolean;
  tag?: AddressTag;
  type?: AddressType;
};

@Injectable()
export class UpdateAccountUseCase {
  private readonly logger = new Logger(UpdateAccountUseCase.name);

  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async execute(
    client: ClientAccount | { id: number | string },
    dto: UpdateClientAccountDto,
  ) {
    await this.db.transaction(async (tx) => {
      const account = await this.findAccount(tx, Number(client.id));

      if (!account) {
        throw new NotFoundException('Client account not found');
      }

      const {
        full_name,
        addresses: addressInputs,
        ...scalarFields
      } = dto as UpdateClientAccountDto & {
        full_name?: string;
        addresses?: AddressInput[];
      };

      const accountPatch: Partial<typeof clientAccounts.$inferInsert> = {};
      const userPatch: Partial<typeof users.$inferInsert> = {};

      // Sync name in users table if provided
      if (full_name !== undefined) {
        accountPatch.name = full_name;
        userPatch.full_name = full_name;
        userPatch.name = full_name;
      }

      if (dto.first_name) {
        accountPatch.first_name = dto.first_name;
      }

      if (dto.last_name) {
        accountPatch.last_name = dto.last_name;
      }

      // Sync avatar and avatar_id in users table if provided
      if (scalarFields.avatar !== undefined) {
        accountPatch.avatar = scalarFields.avatar ?? null;
        userPatch.avatar = scalarFields.avatar ?? null;
      }
      if (scalarFields.avatar_id !== undefined) {
        accountPatch.avatar_id = scalarFields.avatar_id ?? null;
        userPatch.avatar_id = scalarFields.avatar_id ?? null;
      }

      // Merge preferences instead of overwriting
      if (scalarFields.preferences !== undefined) {
        accountPatch.preferences = {
          ...(account.preferences as Record<string, unknown> | null),
          ...(scalarFields.preferences as Record<string, unknown>),
        };
      }

      // Apply remaining scalar fields (whitelisted to real columns)
      const scalarPatch = this.pickScalarFields(scalarFields);
      Object.assign(accountPatch, scalarPatch);

      if (Object.keys(userPatch).length > 0) {
        await tx
          .update(users)
          .set(userPatch)
          .where(eq(users.id, account.user_id));
      }

      if (Object.keys(accountPatch).length > 0) {
        accountPatch.updated_at = new Date();
        await tx
          .update(clientAccounts)
          .set(accountPatch)
          .where(eq(clientAccounts.id, account.id));
      }

      // Replace addresses (cascade)
      if (addressInputs !== undefined && Array.isArray(addressInputs)) {
        await tx
          .delete(addresses)
          .where(eq(addresses.client_account_id, account.id));

        if (addressInputs.length > 0) {
          await tx.insert(addresses).values(
            addressInputs.map((addr) => ({
              street:
                [addr.line1, addr.line2].filter(Boolean).join(', ') ||
                addr.house_no ||
                '',
              house_no: addr.house_no,
              city: addr.city,
              district: addr.district,
              state: addr.state,
              country: addr.country,
              zip_code: addr.zip_code || addr.pincode || null,
              pincode: addr.pincode,
              is_primary: addr.is_primary ?? false,
              tag: addr.tag || AddressTag.OTHER,
              type: addr.type || AddressType.SHIPPING,
              client_account_id: account.id,
            })),
          );
        }
      }
    });

    return new BooleanMessage(true, 'Account updated successfully');
  }

  private async findAccount(
    tx: DrizzleTx,
    id: number,
  ): Promise<ClientAccountRow | null> {
    const [account] = await tx
      .select()
      .from(clientAccounts)
      .where(eq(clientAccounts.id, id))
      .limit(1);

    return account ?? null;
  }

  /**
   * Whitelist of DTO scalar fields mapped 1:1 to `client.account` columns.
   * Handled elsewhere (and excluded here): full_name, preferences,
   * avatar, avatar_id, addresses.
   */
  private pickScalarFields(
    dto: Omit<UpdateClientAccountDto, 'preferences' | 'avatar' | 'avatar_id'>,
  ): Partial<typeof clientAccounts.$inferInsert> {
    const patch: Partial<typeof clientAccounts.$inferInsert> = {};

    if (dto.username !== undefined) patch.username = dto.username ?? null;
    if (dto.date_of_birth !== undefined)
      patch.date_of_birth = dto.date_of_birth
        ? new Date(dto.date_of_birth)
        : null;
    if (dto.time_of_birth !== undefined)
      patch.time_of_birth = dto.time_of_birth ?? null;
    if (dto.place_of_birth !== undefined)
      patch.place_of_birth = dto.place_of_birth ?? null;
    if (dto.gender !== undefined) patch.gender = dto.gender ?? 'other';
    if (dto.phone !== undefined) patch.phone = dto.phone ?? null;
    if (dto.marital_status !== undefined)
      patch.marital_status = dto.marital_status ?? null;
    if (dto.occupation !== undefined) patch.occupation = dto.occupation ?? null;
    if (dto.about_me !== undefined) patch.about_me = dto.about_me ?? null;
    if (dto.language_preference !== undefined)
      patch.language_preference = dto.language_preference ?? null;

    return patch;
  }
}
