import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  inArray,
  or,
  type SQL,
} from 'drizzle-orm';
import { DRIZZLE } from '../../../../../core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '../../../../../core/drizzledb/drizzle.types';
import {
  professions,
  professionSpecializations,
  specializations,
} from '../../../../../core/drizzledb/schema';
import { GetProfessionsDto } from '../dto/request/profession.dto';
import { PaginatedResponseDto } from '../../../../../shared/dto/paginated-response.dto';
import { ProfessionResponseDto } from '../dto/response/profession-response.dto';

const sortColumns = {
  sort_order: professions.sort_order,
  title: professions.title,
  slug: professions.slug,
  created_at: professions.created_at,
} as const;

@Injectable()
export class GetProfessionsUseCase {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async execute(dto: GetProfessionsDto) {
    const where = this.listWhere(dto);

    const sortCol =
      sortColumns[dto.sort_by ?? 'sort_order'] ?? professions.sort_order;
    const direction = (dto.order ?? 'ASC').toUpperCase() === 'DESC' ? desc : asc;
    const orderBy =
      sortCol === professions.sort_order
        ? [direction(sortCol)]
        : [direction(sortCol), asc(professions.sort_order)];

    const items = await this.db
      .select()
      .from(professions)
      .where(where)
      .orderBy(...orderBy)
      .limit(dto.limit)
      .offset(dto.offset);

    const [{ value: total }] = await this.db
      .select({ value: count() })
      .from(professions)
      .where(where);

    const withSpecs = await this.withSpecializations(items);
    const dtos = withSpecs.map((item) => this.toDto(item));
    return PaginatedResponseDto.from(dtos, total, dto);
  }

  async getById(id: number): Promise<ProfessionResponseDto> {
    const rows = await this.db
      .select()
      .from(professions)
      .where(eq(professions.id, id))
      .limit(1);
    const profession = rows[0];
    if (!profession) throw new NotFoundException('Profession not found');

    const [withSpecs] = await this.withSpecializations([profession]);
    return this.toDto(withSpecs);
  }

  private toDto(
    row: typeof professions.$inferSelect & {
      specializations: { id: number; title: string; slug: string }[];
    },
  ): ProfessionResponseDto {
    const dto = new ProfessionResponseDto();
    dto.id = row.id;
    dto.title = row.title;
    dto.slug = row.slug;
    dto.description = row.description;
    dto.icon = row.icon;
    dto.is_active = row.is_active;
    dto.sort_order = row.sort_order;
    dto.created_at = row.created_at;
    dto.updated_at = row.updated_at;
    dto.specializations = row.specializations;
    return dto;
  }

  private listWhere(dto: GetProfessionsDto): SQL {
    const conditions: SQL[] = [];

    // Default to active professions for public listing unless explicitly requested
    if (dto.is_active !== undefined) {
      conditions.push(eq(professions.is_active, dto.is_active));
    } else {
      conditions.push(eq(professions.is_active, true));
    }

    if (dto.search && dto.search.trim()) {
      const searchPattern = `%${dto.search.trim()}%`;
      conditions.push(
        or(
          ilike(professions.title, searchPattern),
          ilike(professions.description, searchPattern),
          ilike(professions.slug, searchPattern),
        )!,
      );
    }

    return and(...conditions)!;
  }
  private async withSpecializations<T extends { id: number }>(
    items: T[],
  ): Promise<(T & { specializations: { id: number; title: string; slug: string }[] })[]> {
    if (items.length === 0) return [];
    const ids = items.map((p) => p.id);

    const rows = await this.db
      .select({
        profession_id: professionSpecializations.profession_id,
        id: specializations.id,
        title: specializations.title,
        slug: specializations.slug,
      })
      .from(professionSpecializations)
      .innerJoin(
        specializations,
        eq(specializations.id, professionSpecializations.specialization_id),
      )
      .where(inArray(professionSpecializations.profession_id, ids));

    const byProfession = new Map<number, { id: number; title: string; slug: string }[]>();
    for (const row of rows) {
      const list = byProfession.get(row.profession_id) ?? [];
      list.push({ id: row.id, title: row.title, slug: row.slug });
      byProfession.set(row.profession_id, list);
    }

    return items.map((item) => ({
      ...item,
      specializations: byProfession.get(item.id) ?? [],
    }));
  }
}
