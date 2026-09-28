import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Festival } from './entities/festival.entity';
import { FestivalController } from './controllers/festival.controller';
import { FestivalService } from './festival.service';
import { GetAllFestivalsUseCase } from './use-cases/get-all-festivals.use-case';
import { GetFestivalUseCase } from './use-cases/get-festival.use-case';
import { CreateFestivalUseCase } from './use-cases/create-festival.use-case';
import { UpdateFestivalUseCase } from './use-cases/update-festival.use-case';
import { RemoveFestivalUseCase } from './use-cases/remove-festival.use-case';

@Module({
  imports: [TypeOrmModule.forFeature([Festival])],
  controllers: [FestivalController],
  providers: [
    FestivalService,
    GetAllFestivalsUseCase,
    GetFestivalUseCase,
    CreateFestivalUseCase,
    UpdateFestivalUseCase,
    RemoveFestivalUseCase,
  ],
  exports: [FestivalService],
})
export class FestivalModule {}
