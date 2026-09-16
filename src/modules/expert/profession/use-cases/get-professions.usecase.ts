import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Profession } from '../entities/profession.entity';
import { GetProfessionsDto } from '../dto/request/profession.dto';
import { PaginatedResponseDto } from '@/common/dto/paginated-response.dto';
import { ProfessionResponseDto } from '../dto/response/profession-response.dto';

@Injectable()
export class GetProfessionsUseCase {
  constructor(
    @InjectRepository(Profession)
    private readonly professionRepo: Repository<Profession>,
  ) {}

  async execute(dto: GetProfessionsDto) {
    const query = this.professionRepo
      .createQueryBuilder('profession')
      .leftJoinAndSelect('profession.specializations', 'specializations');

    if (dto.is_active !== undefined) {
      query.andWhere('profession.is_active = :isActive', {
        isActive: dto.is_active,
      });
    } else {
      query.andWhere('profession.is_active = true');
    }

    if (dto.search && dto.search.trim()) {
      const searchPattern = `%${dto.search.trim().toLowerCase()}%`;
      query.andWhere(
        '(LOWER(profession.title) LIKE :search OR LOWER(profession.description) LIKE :search OR LOWER(profession.slug) LIKE :search)',
        { search: searchPattern },
      );
    }

    const sortBy = dto.sort_by || 'sort_order';
    const orderDirection = (dto.order || 'ASC').toUpperCase() as 'ASC' | 'DESC';

    query.orderBy(`profession.${sortBy}`, orderDirection);
    if (sortBy !== 'sort_order') {
      query.addOrderBy('profession.sort_order', 'ASC');
    }

    query.skip(dto.offset).take(dto.limit);

    const [items, total] = await query.getManyAndCount();

    const dtos = items.map((item) => ProfessionResponseDto.from(item));

    return PaginatedResponseDto.from(dtos, total, dto);
  }

  async getById(id: number): Promise<ProfessionResponseDto> {
    const profession = await this.professionRepo.findOne({
      where: { id },
      relations: ['specializations'],
    });

    if (!profession) {
      throw new NotFoundException('Profession not found');
    }

    return ProfessionResponseDto.from(profession);
  }
}
