import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Festival } from './infrastructure/entities/festival.entity';
import { FestivalController } from './api/controllers/festival.controller';
import { FestivalFacade } from './application/festival.facade';
import { GetAllFestivalsUseCase } from './application/use-cases/get-all-festivals.use-case';
import { GetFestivalUseCase } from './application/use-cases/get-festival.use-case';
import { CreateFestivalUseCase } from './application/use-cases/create-festival.use-case';
import { UpdateFestivalUseCase } from './application/use-cases/update-festival.use-case';
import { RemoveFestivalUseCase } from './application/use-cases/remove-festival.use-case';

@Module({
  imports: [TypeOrmModule.forFeature([Festival])],
  controllers: [FestivalController],
  providers: [
    FestivalFacade,
    GetAllFestivalsUseCase,
    GetFestivalUseCase,
    CreateFestivalUseCase,
    UpdateFestivalUseCase,
    RemoveFestivalUseCase,
  ],
  exports: [FestivalFacade],
})
export class FestivalModule {}
