import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AstrologyService } from '../entities/astrology-service.entity';
import { GetAstrologyServicesDto } from '../dto/get-astrology-services.dto';
import { PaginatedResponseDto } from '@/common/dto/paginated-response.dto';

@Injectable()
export class GetAstrologyServicesUseCase {
  constructor(
    @InjectRepository(AstrologyService)
    private readonly serviceRepo: Repository<AstrologyService>,
  ) {}

  async execute(dto: GetAstrologyServicesDto) {
    const query = this.serviceRepo.createQueryBuilder('service');

    if (dto.is_active !== undefined) {
      query.andWhere('service.is_active = :isActive', {
        isActive: dto.is_active,
      });
    } else {
      query.andWhere('service.is_active = true');
    }

    if (dto.delivery_type) {
      query.andWhere('service.delivery_type = :deliveryType', {
        deliveryType: dto.delivery_type,
      });
    }

    if (dto.search && dto.search.trim()) {
      const searchPattern = `%${dto.search.trim().toLowerCase()}%`;
      query.andWhere(
        '(LOWER(service.title) LIKE :search OR LOWER(service.description) LIKE :search OR LOWER(service.slug) LIKE :search)',
        { search: searchPattern },
      );
    }

    const sortBy = dto.sort_by || 'sort_order';
    const orderDirection = (dto.order || 'ASC').toUpperCase() as 'ASC' | 'DESC';

    query.orderBy(`service.${sortBy}`, orderDirection);
    if (sortBy !== 'sort_order') {
      query.addOrderBy('service.sort_order', 'ASC');
    }

    query.skip(dto.offset).take(dto.limit);

    const [items, total] = await query.getManyAndCount();

    return PaginatedResponseDto.from(items, total, dto);
  }

  async getById(id: string): Promise<AstrologyService> {
    const item = await this.serviceRepo.findOne({ where: { id } });
    if (!item) {
      throw new NotFoundException('Astrology service not found');
    }
    return item;
  }
}
