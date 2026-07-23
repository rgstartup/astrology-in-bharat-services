import { Injectable, NotFoundException } from '@nestjs/common';
import { BooleanMessage } from '@/common/dto/boolean-message.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Festival } from '../../infrastructure/entities/festival.entity';
import { UpdateFestivalDto } from '../../api/dto/festival.dto';

@Injectable()
export class UpdateFestivalUseCase {
  constructor(
    @InjectRepository(Festival)
    private readonly festivalRepo: Repository<Festival>,
  ) {}

  async execute(id: string, dto: UpdateFestivalDto) {
    const festival = await this.festivalRepo.findOne({ where: { id } });
    if (!festival) {
      throw new NotFoundException(`Festival with ID ${id} not found`);
    }
    Object.assign(festival, dto);
    await this.festivalRepo.save(festival);
    return new BooleanMessage();
  }
}
