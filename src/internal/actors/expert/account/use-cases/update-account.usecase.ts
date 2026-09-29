import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import { expertAccounts, users } from '@/core/drizzledb/schema';
import { IExpert } from '@/shared/types/access-token.payload';
import { UpdateExpertAccountDto } from '../dto/request/account.dto';
import { toExpertAccountResponse } from '../account.mapper';

@Injectable()
export class UpdateExpertAccountUseCase {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async execute(expert: IExpert, dto: UpdateExpertAccountDto) {
    const rawDto = dto as Record<string, unknown>;

    return this.db.transaction(async (tx) => {
      const [account] = await tx
        .select()
        .from(expertAccounts)
        .where(eq(expertAccounts.id, Number(expert.sub)))
        .limit(1);
      if (!account) throw new NotFoundException('Expert account not found');

      // Non-column DTO props (`full_name` handled below; `addresses`, `expert`,
      // `first_name`, `last_name` have no column in expert.account) must not reach `.set()`.
      const {
        full_name,
        first_name,
        last_name,
        addresses: _addresses,
        expert: _expertFlag,
        languages,
        gallery,
        videos,
        certificates,
        date_of_birth,
        ...rest
      } = rawDto;

      const set: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(rest)) {
        if (value !== undefined) set[key] = value;
      }
      if (languages !== undefined) {
        set.languages = Array.isArray(languages)
          ? (languages as unknown[]).join(',')
          : languages;
      }
      for (const [key, value] of [
        ['gallery', gallery],
        ['videos', videos],
        ['certificates', certificates],
      ] as const) {
        if (value !== undefined) {
          set[key] = Array.isArray(value) ? value.join(',') : value;
        }
      }
      if (date_of_birth !== undefined) {
        set.date_of_birth = date_of_birth
          ? new Date(date_of_birth as string | number | Date)
          : null;
      }
      if (full_name !== undefined) {
        set.name = full_name;
      }

      let updated = account;
      if (Object.keys(set).length > 0) {
        [updated] = await tx
          .update(expertAccounts)
          .set({ ...set, updated_at: new Date() } as Partial<
            typeof expertAccounts.$inferInsert
          >)
          .where(eq(expertAccounts.id, account.id))
          .returning();
      }

      let user: Record<string, unknown> | null = null;
      if (account.user_id) {
        const userSet: Record<string, unknown> = {};
        if (first_name !== undefined) {
          userSet.first_name = first_name;
        }
        if (last_name !== undefined) {
          userSet.last_name = last_name;
        }
        if (full_name !== undefined) {
          userSet.full_name = full_name;
          userSet.name = full_name;
        } else if (rawDto.name !== undefined) {
          userSet.full_name = rawDto.name;
          userSet.name = rawDto.name;
        }
        if (rawDto.email !== undefined) {
          userSet.email = rawDto.email;
        }
        if (rawDto.avatar !== undefined) {
          userSet.avatar = rawDto.avatar;
        }

        if (Object.keys(userSet).length > 0) {
          const [updatedUser] = await tx
            .update(users)
            .set({ ...userSet, updated_at: new Date() })
            .where(eq(users.id, account.user_id))
            .returning();
          user = updatedUser ?? null;
        } else {
          const [existingUser] = await tx
            .select()
            .from(users)
            .where(eq(users.id, account.user_id))
            .limit(1);
          user = existingUser ?? null;
        }

        if (user && 'password' in user) {
          const { password: _password, ...safeUser } = user;
          user = safeUser;
        }
      }

      return { ...toExpertAccountResponse(updated), user };
    });
  }
}
