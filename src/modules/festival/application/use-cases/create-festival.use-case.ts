import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Festival } from '../../infrastructure/persistence/entities/festival.entity';
import { CreateFestivalDto } from '../../api/dto/festival.dto';

@Injectable()
export class CreateFestivalUseCase {
  constructor(
    @InjectRepository(Festival)
    private readonly festivalRepo: Repository<Festival>,
  ) {}

  async execute(dto: CreateFestivalDto) {
    const festival = this.festivalRepo.create(dto);
    return this.festivalRepo.save(festival);
  }
}
