import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlacesController } from './api/controllers/places.controller';
import { PlacesFacade } from './application/places.facade';
import { PlacesCronService } from './application/places-cron.service';
import { SearchPlacesUseCase } from './application/use-cases/search-places.use-case';
import { GetPlaceImagesUseCase } from './application/use-cases/get-place-images.use-case';
import { RefreshPlaceSearchCacheUseCase } from './application/use-cases/refresh-place-search-cache.use-case';
import { RefreshPlaceImagesCacheUseCase } from './application/use-cases/refresh-place-images-cache.use-case';
import { Place, PlaceImage } from './infrastructure/entities/place.entity';
import { SerperModule } from '@/external/serper/serper.module';
import { PlacesMapper } from './application/places.mapper';

@Module({
  imports: [TypeOrmModule.forFeature([Place, PlaceImage]), SerperModule],
  controllers: [PlacesController],
  providers: [
    PlacesFacade,
    PlacesCronService,
    SearchPlacesUseCase,
    GetPlaceImagesUseCase,
    RefreshPlaceSearchCacheUseCase,
    RefreshPlaceImagesCacheUseCase,
    PlacesMapper,
  ],
  exports: [PlacesFacade],
})
export class PlacesModule {}
