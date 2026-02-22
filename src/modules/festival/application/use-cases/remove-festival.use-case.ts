import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Festival } from '../../infrastructure/persistence/entities/festival.entity';

@Injectable()
export class RemoveFestivalUseCase {
  constructor(
    @InjectRepository(Festival)
    private readonly festivalRepo: Repository<Festival>,
  ) {}

  async execute(id: number) {
    const festival = await this.festivalRepo.findOne({ where: { id } });
    if (!festival) {
      throw new NotFoundException(`Festival with ID ${id} not found`);
    }
    return this.festivalRepo.remove(festival);
  }
}
