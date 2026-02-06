import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Festival } from './entities/festival.entity';
import { FestivalController } from './festival.controller';
import { FestivalService } from './festival.service';

@Module({
  imports: [TypeOrmModule.forFeature([Festival])],
  controllers: [FestivalController],
  providers: [FestivalService],
  exports: [FestivalService],
})
export class FestivalModule {}
