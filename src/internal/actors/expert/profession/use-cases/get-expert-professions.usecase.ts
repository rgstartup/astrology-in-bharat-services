import { Inject, Injectable } from '@nestjs/common';
import { asc, desc, eq } from 'drizzle-orm';
import { DRIZZLE } from '../../../../../core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '../../../../../core/drizzledb/drizzle.types';
import {
  expertProfessions,
  professions,
} from '../../../../../core/drizzledb/schema';
import { ExpertProfessionResponseDto } from '../dto/response/profession-response.dto';
import { IExpert } from '../../../../../shared/types/access-token.payload';

@Injectable()
export class GetExpertProfessionsUseCase {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async execute(expert: IExpert): Promise<ExpertProfessionResponseDto[]> {
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
      const dto = new ExpertProfessionResponseDto();
      dto.id = row.id;
      dto.profession_id = row.profession_id;
      dto.is_primary = row.is_primary;
      dto.title = row.title;
      dto.slug = row.slug;
      dto.icon = row.icon;
      return dto;
    });
  }
}
