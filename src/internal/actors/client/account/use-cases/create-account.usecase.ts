import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { DRIZZLE } from '../../../../../core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '../../../../../core/drizzledb/drizzle.types';
import { clientAccounts, users } from '../../../../../core/drizzledb/schema';
import { toClientAccountResponse } from '../account.mapper';
import { CreateClientAccountDto } from '../dto/account.dto';

@Injectable()
export class CreateAccountUseCase {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async execute(userId: number | string, dto: CreateClientAccountDto) {
    const user_id = Number(userId);

    const [existingAccount] = await this.db
      .select()
      .from(clientAccounts)
      .where(eq(clientAccounts.user_id, user_id))
      .limit(1);

    if (existingAccount) return toClientAccountResponse(existingAccount);

    const [user] = await this.db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(users.id, user_id))
      .limit(1);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const {
      full_name,
      addresses: _addresses,
      preferences,
      date_of_birth,
      ...scalarFields
    } = dto;

    const [account] = await this.db
      .insert(clientAccounts)
      .values({
        user_id: user.id,
        public_id: nanoid(12),
        email: user.email,
        first_name: dto.first_name ?? null,
        last_name: dto.last_name ?? null,
        name:
          full_name ||
          [dto.first_name, dto.last_name].filter(Boolean).join(' ') ||
          null,
        date_of_birth: date_of_birth ? new Date(date_of_birth) : null,
        preferences: (preferences ?? {}) as Record<string, unknown>,
        ...scalarFields,
      })
      .returning();

    return toClientAccountResponse(account);
  }
}
