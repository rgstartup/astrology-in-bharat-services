import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Specialization } from '../entities/specialization.entity';
import { GetSpecializationsDto } from '../dto/request/get-specializations.dto';
import { PaginatedResponseDto } from '@/common/dto/paginated-response.dto';

@Injectable()
export class GetSpecializationsUseCase {
  constructor(
    @InjectRepository(Specialization)
    private readonly specializationRepo: Repository<Specialization>,
  ) {}

  async execute(dto: GetSpecializationsDto) {
    const query = this.specializationRepo
      .createQueryBuilder('spec')
      .leftJoinAndSelect('spec.professions', 'professions');

    // Default to active specializations for public listing unless explicitly requested
    if (dto.is_active !== undefined) {
      query.andWhere('spec.is_active = :isActive', {
        isActive: dto.is_active,
      });
    } else {
      query.andWhere('spec.is_active = true');
    }

    if (dto.profession_id) {
      query.innerJoin(
        'spec.professions',
        'filter_prof',
        'filter_prof.id = :professionId',
        { professionId: dto.profession_id },
      );
    } else if (dto.profession_slug) {
      query.innerJoin(
        'spec.professions',
        'filter_prof',
        'filter_prof.slug = :professionSlug',
        { professionSlug: dto.profession_slug },
      );
    } else if (dto.profession_ids && dto.profession_ids.length > 0) {
      query.innerJoin(
        'spec.professions',
        'filter_prof',
        'filter_prof.id IN (:...professionIds)',
        { professionIds: dto.profession_ids },
      );
    }

    if (dto.search && dto.search.trim()) {
      const searchPattern = `%${dto.search.trim().toLowerCase()}%`;
      query.andWhere(
        '(LOWER(spec.title) LIKE :search OR LOWER(spec.description) LIKE :search OR LOWER(spec.slug) LIKE :search)',
        { search: searchPattern },
      );
    }

    const sortBy = dto.sort_by || 'sort_order';
    const orderDirection = (dto.order || 'ASC').toUpperCase() as 'ASC' | 'DESC';

    query.orderBy(`spec.${sortBy}`, orderDirection);
    if (sortBy !== 'sort_order') {
      query.addOrderBy('spec.sort_order', 'ASC');
    }

    query.skip(dto.offset).take(dto.limit);

    const [items, total] = await query.getManyAndCount();

    return PaginatedResponseDto.from(items, total, dto);
  }

  async getAvailableForExpert(expertId: string) {
    const query = this.specializationRepo
      .createQueryBuilder('spec')
      .innerJoin('spec.professions', 'prof')
      .innerJoin(
        'expert.expert_professions',
        'ep',
        'ep.profession_id = prof.id AND ep.expert_id = :expertId',
        { expertId },
      )
      .where('spec.is_active = true')
      .orderBy('spec.sort_order', 'ASC');

    const items = await query.getMany();
    return items;
  }
}

