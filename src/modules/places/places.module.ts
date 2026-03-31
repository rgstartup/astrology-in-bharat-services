import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlacesController } from './api/controllers/places.controller';
import { PlacesService } from './application/places.service';
import { Place, PlaceImage } from './infrastructure/persistence/entities/place.entity';
import { SerperModule } from '@/external/serper/serper.module';
import { PlacesMapper } from './application/places.mapper';

@Module({
  imports: [
    TypeOrmModule.forFeature([Place, PlaceImage]),
    SerperModule,
  ],
  controllers: [PlacesController],
  providers: [PlacesService, PlacesMapper],
  exports: [PlacesService],
})
export class PlacesModule {}
