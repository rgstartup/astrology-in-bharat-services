import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlacesController } from './controllers/places.controller';
import { PlacesFacade } from './places.facade';
import { PlacesCronService } from './places-cron.service';
import { SearchPlacesUseCase } from './use-cases/search-places.use-case';
import { GetPlaceImagesUseCase } from './use-cases/get-place-images.use-case';
import { RefreshPlaceSearchCacheUseCase } from './use-cases/refresh-place-search-cache.use-case';
import { RefreshPlaceImagesCacheUseCase } from './use-cases/refresh-place-images-cache.use-case';
import { Place, PlaceImage } from './entities/place.entity';
import { SerperModule } from '@/external/serper/serper.module';
import { PlacesMapper } from './places.mapper';

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
