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
    const query = this.specializationRepo.createQueryBuilder('spec');

    // Default to active specializations for public listing unless explicitly requested
    if (dto.is_active !== undefined) {
      query.andWhere('spec.is_active = :isActive', {
        isActive: dto.is_active,
      });
    } else {
      query.andWhere('spec.is_active = true');
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
}
