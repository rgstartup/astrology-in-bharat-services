import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import { DRIZZLE } from '../../../../../core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '../../../../../core/drizzledb/drizzle.types';
import {
  expertAccounts,
  expertProfessions,
  professions,
} from '../../../../../core/drizzledb/schema';
import { SyncExpertProfessionsDto } from '../dto/request/profession.dto';
import { ExpertProfessionResponseDto } from '../dto/response/profession-response.dto';
import { IExpert } from '../../../../../shared/types/access-token.payload';

@Injectable()
export class SyncExpertProfessionsUseCase {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async execute(
    expert: IExpert,
    dto: SyncExpertProfessionsDto,
  ): Promise<ExpertProfessionResponseDto[]> {
    const [expertAccount] = await this.db
      .select({ id: expertAccounts.id })
      .from(expertAccounts)
      .where(eq(expertAccounts.id, expert.sub))
      .limit(1);

    if (!expertAccount) {
      throw new NotFoundException('Expert account not found');
    }

    if (!dto.profession_ids || dto.profession_ids.length === 0) {
      throw new BadRequestException('At least one profession must be selected');
    }

    const uniqueProfessionIds = Array.from(new Set(dto.profession_ids));

    // Verify all requested professions exist and are active
    const validProfessions = await this.db
      .select({ id: professions.id })
      .from(professions)
      .where(
        and(
          inArray(professions.id, uniqueProfessionIds),
          eq(professions.is_active, true),
        ),
      );

    if (validProfessions.length !== uniqueProfessionIds.length) {
      throw new BadRequestException(
        'One or more selected professions are invalid or inactive',
      );
    }

    const primaryId =
      dto.primary_profession_id &&
      uniqueProfessionIds.includes(dto.primary_profession_id)
        ? dto.primary_profession_id
        : uniqueProfessionIds[0];

    // Sync semantics: replace the full set in one transaction.
    await this.db.transaction(async (tx) => {
      await tx
        .delete(expertProfessions)
        .where(eq(expertProfessions.expert_id, expert.sub));

      await tx.insert(expertProfessions).values(
        uniqueProfessionIds.map((profession_id) => ({
          expert_id: expert.sub,
          profession_id,
          is_primary: profession_id === primaryId,
        })),
      );
    });

    // Return the updated list (primary first, then by creation order)
    const rows = await this.db
      .select({
        id: expertProfessions.id,
        profession_id: expertProfessions.profession_id,
        is_primary: expertProfessions.is_primary,
        title: professions.title,
        slug: professions.slug,
        icon: professions.icon,
      })
      .from(expertProfessions)
      .innerJoin(
        professions,
        eq(professions.id, expertProfessions.profession_id),
      )
      .where(eq(expertProfessions.expert_id, expert.sub))
      .orderBy(
        desc(expertProfessions.is_primary),
        asc(expertProfessions.created_at),
      );

    return rows.map((row) => {
      const response = new ExpertProfessionResponseDto();
      response.id = row.id;
      response.profession_id = row.profession_id;
      response.is_primary = row.is_primary;
      response.title = row.title;
      response.slug = row.slug;
      response.icon = row.icon;
      return response;
    });
  }
}
