import { Injectable } from '@nestjs/common';
import { GetAllFestivalsUseCase } from './use-cases/get-all-festivals.use-case';
import { GetFestivalUseCase } from './use-cases/get-festival.use-case';
import { CreateFestivalUseCase } from './use-cases/create-festival.use-case';
import { UpdateFestivalUseCase } from './use-cases/update-festival.use-case';
import { RemoveFestivalUseCase } from './use-cases/remove-festival.use-case';
import { CreateFestivalDto, UpdateFestivalDto } from '../api/dto/festival.dto';

@Injectable()
export class FestivalFacade {
  constructor(
    private readonly getAllFestivalsUseCase: GetAllFestivalsUseCase,
    private readonly getFestivalUseCase: GetFestivalUseCase,
    private readonly createFestivalUseCase: CreateFestivalUseCase,
    private readonly updateFestivalUseCase: UpdateFestivalUseCase,
    private readonly removeFestivalUseCase: RemoveFestivalUseCase,
  ) {}

  async findAll(year?: number, month?: number) {
    return this.getAllFestivalsUseCase.execute(year, month);
  }

  async findOne(id: number) {
    return this.getFestivalUseCase.execute(id);
  }

  async create(dto: CreateFestivalDto) {
    return this.createFestivalUseCase.execute(dto);
  }

  async update(id: number, dto: UpdateFestivalDto) {
    return this.updateFestivalUseCase.execute(id, dto);
  }

  async remove(id: number) {
    return this.removeFestivalUseCase.execute(id);
  }
}
