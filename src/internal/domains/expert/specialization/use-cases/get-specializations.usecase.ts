import { Inject, Injectable } from '@nestjs/common';
import {
  and,
  asc,
  count,
  desc,
  eq,
  exists,
  ilike,
  inArray,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import {
  expertProfessions,
  professionSpecializations,
  professions,
  specializations,
} from '@/core/drizzledb/schema';
import { GetSpecializationsDto } from '../dto/request/get-specializations.dto';
import { PaginatedResponseDto } from '@/shared/dto/paginated-response.dto';

const sortColumns = {
  sort_order: specializations.sort_order,
  title: specializations.title,
  slug: specializations.slug,
  created_at: specializations.created_at,
} as const;

@Injectable()
export class GetSpecializationsUseCase {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async execute(dto: GetSpecializationsDto) {
    const where = this.listWhere(dto);

    const sortCol =
      sortColumns[dto.sort_by ?? 'sort_order'] ?? specializations.sort_order;
    const direction =
      (dto.order ?? 'ASC').toUpperCase() === 'DESC' ? desc : asc;
    const orderBy =
      sortCol === specializations.sort_order
        ? [direction(sortCol)]
        : [direction(sortCol), asc(specializations.sort_order)];

    const items = await this.db
      .select()
      .from(specializations)
      .where(where)
      .orderBy(...orderBy)
      .limit(dto.limit)
      .offset(dto.offset);

    const [{ value: total }] = await this.db
      .select({ value: count() })
      .from(specializations)
      .where(where);

    const data = await this.withProfessions(items);
    return PaginatedResponseDto.from(data, total, dto);
  }

  async getAvailableForExpert(expertId: number) {
    return this.db
      .select()
      .from(specializations)
      .where(
        and(
          eq(specializations.is_active, true),
          exists(
            this.db
              .select({ one: sql`1` })
              .from(professionSpecializations)
              .innerJoin(
                expertProfessions,
                eq(
                  expertProfessions.profession_id,
                  professionSpecializations.profession_id,
                ),
              )
              .where(
                and(
                  eq(
                    professionSpecializations.specialization_id,
                    specializations.id,
                  ),
                  eq(expertProfessions.expert_id, Number(expertId)),
                ),
              ),
          ),
        ),
      )
      .orderBy(asc(specializations.sort_order));
  }

  private listWhere(dto: GetSpecializationsDto): SQL {
    const conditions: SQL[] = [];

    // Default to active specializations for public listing unless explicitly requested
    if (dto.is_active !== undefined) {
      conditions.push(eq(specializations.is_active, dto.is_active));
    } else {
      conditions.push(eq(specializations.is_active, true));
    }

    if (dto.profession_id) {
      conditions.push(
        exists(
          this.db
            .select({ one: sql`1` })
            .from(professionSpecializations)
            .where(
              and(
                eq(
                  professionSpecializations.specialization_id,
                  specializations.id,
                ),
                eq(
                  professionSpecializations.profession_id,
                  Number(dto.profession_id),
                ),
              ),
            ),
        ),
      );
    } else if (dto.profession_slug) {
      conditions.push(
        exists(
          this.db
            .select({ one: sql`1` })
            .from(professionSpecializations)
            .innerJoin(
              professions,
              eq(professions.id, professionSpecializations.profession_id),
            )
            .where(
              and(
                eq(
                  professionSpecializations.specialization_id,
                  specializations.id,
                ),
                eq(professions.slug, dto.profession_slug),
              ),
            ),
        ),
      );
    } else if (dto.profession_ids && dto.profession_ids.length > 0) {
      conditions.push(
        exists(
          this.db
            .select({ one: sql`1` })
            .from(professionSpecializations)
            .where(
              and(
                eq(
                  professionSpecializations.specialization_id,
                  specializations.id,
                ),
                inArray(
                  professionSpecializations.profession_id,
                  dto.profession_ids.map(Number),
                ),
              ),
            ),
        ),
      );
    }

    if (dto.search && dto.search.trim()) {
      const searchPattern = `%${dto.search.trim()}%`;
      conditions.push(
        or(
          ilike(specializations.title, searchPattern),
          ilike(specializations.description, searchPattern),
          ilike(specializations.slug, searchPattern),
        )!,
      );
    }

    return and(...conditions)!;
  }

  private async withProfessions<T extends { id: number }>(specs: T[]) {
    if (specs.length === 0) return [];
    const ids = specs.map((s) => s.id);

    const rows = await this.db
      .select({
        specialization_id: professionSpecializations.specialization_id,
        id: professions.id,
        title: professions.title,
        slug: professions.slug,
        description: professions.description,
        icon: professions.icon,
        is_active: professions.is_active,
        sort_order: professions.sort_order,
        created_at: professions.created_at,
        updated_at: professions.updated_at,
      })
      .from(professionSpecializations)
      .innerJoin(
        professions,
        eq(professions.id, professionSpecializations.profession_id),
      )
      .where(inArray(professionSpecializations.specialization_id, ids));

    const bySpec = new Map<number, typeof rows>();
    for (const row of rows) {
      const list = bySpec.get(row.specialization_id) ?? [];
      list.push(row);
      bySpec.set(row.specialization_id, list);
    }

    return specs.map((spec) => ({
      ...spec,
      professions: (bySpec.get(spec.id) ?? []).map(
        ({ specialization_id: _sid, ...profession }) => profession,
      ),
    }));
  }
}
