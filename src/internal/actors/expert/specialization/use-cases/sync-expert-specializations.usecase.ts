import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { DRIZZLE } from '../../../../../core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '../../../../../core/drizzledb/drizzle.types';
import {
  expertAccounts,
  expertSpecializations,
  specializations,
} from '../../../../../core/drizzledb/schema';
import { IExpert } from '@/shared/types/access-token.payload';
import { SyncExpertSpecializationsDto } from '../dto/request/sync-expert-specializations.dto';
import {
  ExpertAccountNotFoundError,
  InvalidSpecializationSelectionError,
} from '../errors';

@Injectable()
export class SyncExpertSpecializationsUseCase {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async execute(
    expert: IExpert,
    dto: SyncExpertSpecializationsDto,
  ): Promise<
    {
      id: number;
      specialization_id: number;
      title: string;
      slug: string;
      icon: string | null;
    }[]
  > {
    const [expertAccount] = await this.db
      .select({ id: expertAccounts.id })
      .from(expertAccounts)
      .where(eq(expertAccounts.id, expert.sub))
      .limit(1);

    if (!expertAccount) {
      throw new ExpertAccountNotFoundError();
    }

    const uniqueIds = Array.from(new Set(dto.specialization_ids));

    const validSpecializations = await this.db
      .select({ id: specializations.id })
      .from(specializations)
      .where(
        and(
          inArray(specializations.id, uniqueIds),
          eq(specializations.is_active, true),
        ),
      );

    if (validSpecializations.length !== uniqueIds.length) {
      throw new InvalidSpecializationSelectionError();
    }

    // Sync semantics: replace the full set in one transaction.
    await this.db.transaction(async (tx) => {
      await tx
        .delete(expertSpecializations)
        .where(eq(expertSpecializations.expert_id, expert.sub));

      await tx.insert(expertSpecializations).values(
        uniqueIds.map((specialization_id) => ({
          expert_id: expert.sub,
          specialization_id,
        })),
      );
    });

    return this.db
      .select({
        id: expertSpecializations.id,
        specialization_id: expertSpecializations.specialization_id,
        title: specializations.title,
        slug: specializations.slug,
        icon: specializations.icon,
      })
      .from(expertSpecializations)
      .innerJoin(
        specializations,
        eq(specializations.id, expertSpecializations.specialization_id),
      )
      .where(eq(expertSpecializations.expert_id, expert.sub))
      .orderBy(asc(expertSpecializations.created_at));
  }
}
