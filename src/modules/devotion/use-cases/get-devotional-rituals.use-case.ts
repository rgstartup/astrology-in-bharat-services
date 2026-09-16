import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DevotionalRitual } from '../entities/devotional-ritual.entity';
import { GetDevotionalRitualsDto } from '../dto/get-devotional-rituals.dto';
import { PaginatedResponseDto } from '@/common/dto/paginated-response.dto';

@Injectable()
export class GetDevotionalRitualsUseCase {
  constructor(
    @InjectRepository(DevotionalRitual)
    private readonly ritualRepo: Repository<DevotionalRitual>,
  ) {}

  async execute(dto: GetDevotionalRitualsDto) {
    const query = this.ritualRepo.createQueryBuilder('ritual');

    if (dto.is_active !== undefined) {
      query.andWhere('ritual.is_active = :isActive', {
        isActive: dto.is_active,
      });
    } else {
      query.andWhere('ritual.is_active = true');
    }

    if (dto.deity) {
      query.andWhere('LOWER(ritual.deity) LIKE :deity', {
        deity: `%${dto.deity.toLowerCase()}%`,
      });
    }

    if (dto.search && dto.search.trim()) {
      const searchPattern = `%${dto.search.trim().toLowerCase()}%`;
      query.andWhere(
        '(LOWER(ritual.title) LIKE :search OR LOWER(ritual.description) LIKE :search OR LOWER(ritual.slug) LIKE :search OR LOWER(ritual.deity) LIKE :search)',
        { search: searchPattern },
      );
    }

    const sortBy = dto.sort_by || 'sort_order';
    const orderDirection = (dto.order || 'ASC').toUpperCase() as 'ASC' | 'DESC';

    query.orderBy(`ritual.${sortBy}`, orderDirection);
    if (sortBy !== 'sort_order') {
      query.addOrderBy('ritual.sort_order', 'ASC');
    }

    query.skip(dto.offset).take(dto.limit);

    const [items, total] = await query.getManyAndCount();

    return PaginatedResponseDto.from(items, total, dto);
  }

  async getById(id: number): Promise<DevotionalRitual> {
    const item = await this.ritualRepo.findOne({ where: { id } });
    if (!item) {
      throw new NotFoundException('Devotional ritual not found');
    }
    return item;
  }
}
