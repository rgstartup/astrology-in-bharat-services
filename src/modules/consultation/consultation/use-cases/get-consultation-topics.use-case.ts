import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConsultationTopic } from '../entities/consultation_topic.entity';
import { GetConsultationTopicsDto } from '../dto/get-consultation-topics.dto';
import { PaginatedResponseDto } from '@/common/dto/paginated-response.dto';

@Injectable()
export class GetConsultationTopicsUseCase {
  constructor(
    @InjectRepository(ConsultationTopic)
    private readonly topicRepo: Repository<ConsultationTopic>,
  ) {}

  async execute(dto: GetConsultationTopicsDto) {
    const query = this.topicRepo.createQueryBuilder('topic');

    // Default to active topics for public listing unless explicitly queried
    if (dto.is_active !== undefined) {
      query.andWhere('topic.is_active = :isActive', {
        isActive: dto.is_active,
      });
    } else {
      query.andWhere('topic.is_active = true');
    }

    if (dto.search && dto.search.trim()) {
      const searchPattern = `%${dto.search.trim().toLowerCase()}%`;
      query.andWhere(
        '(LOWER(topic.title) LIKE :search OR LOWER(topic.description) LIKE :search OR LOWER(topic.slug) LIKE :search)',
        { search: searchPattern },
      );
    }

    const sortBy = dto.sort_by || 'sort_order';
    const orderDirection = (dto.order || 'ASC').toUpperCase() as 'ASC' | 'DESC';

    query.orderBy(`topic.${sortBy}`, orderDirection);
    if (sortBy !== 'sort_order') {
      query.addOrderBy('topic.sort_order', 'ASC');
    }

    query.skip(dto.offset).take(dto.limit);

    const [items, total] = await query.getManyAndCount();

    return PaginatedResponseDto.from(items, total, dto);
  }
}
