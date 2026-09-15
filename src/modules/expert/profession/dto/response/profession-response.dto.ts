import { Profession } from '../../entities/profession.entity';
import { ExpertProfession } from '../../entities/expert-profession.entity';

export class ProfessionResponseDto {
  id!: string;
  title!: string;
  slug!: string;
  description!: string | null;
  icon!: string | null;
  is_active!: boolean;
  sort_order!: number;
  specializations?: { id: string; title: string; slug: string }[];
  created_at!: Date;
  updated_at!: Date;

  static from(entity: Profession): ProfessionResponseDto {
    const dto = new ProfessionResponseDto();
    dto.id = entity.id;
    dto.title = entity.title;
    dto.slug = entity.slug;
    dto.description = entity.description;
    dto.icon = entity.icon;
    dto.is_active = entity.is_active;
    dto.sort_order = entity.sort_order;
    dto.created_at = entity.created_at;
    dto.updated_at = entity.updated_at;

    if (entity.specializations) {
      dto.specializations = entity.specializations.map((spec) => ({
        id: spec.id,
        title: spec.title,
        slug: spec.slug,
      }));
    }

    return dto;
  }
}

export class ExpertProfessionResponseDto {
  id!: string;
  profession_id!: string;
  title!: string;
  slug!: string;
  icon!: string | null;
  is_primary!: boolean;

  static from(entity: ExpertProfession): ExpertProfessionResponseDto {
    const dto = new ExpertProfessionResponseDto();
    dto.id = entity.id;
    dto.profession_id = entity.profession_id;
    dto.is_primary = entity.is_primary;
    if (entity.profession) {
      dto.title = entity.profession.title;
      dto.slug = entity.profession.slug;
      dto.icon = entity.profession.icon;
    }
    return dto;
  }
}
