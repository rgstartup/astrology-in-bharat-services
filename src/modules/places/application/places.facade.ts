import { Injectable } from '@nestjs/common';
import { SearchPlacesUseCase } from './use-cases/search-places.use-case';
import { GetPlaceImagesUseCase } from './use-cases/get-place-images.use-case';

@Injectable()
export class PlacesFacade {
  constructor(
    private readonly searchPlacesUseCase: SearchPlacesUseCase,
    private readonly getPlaceImagesUseCase: GetPlaceImagesUseCase,
  ) {}

  async searchPlaces(query: string, location: string = 'India') {
    return this.searchPlacesUseCase.execute(query, location);
  }

  async getPlaceImages(query: string) {
    return this.getPlaceImagesUseCase.execute(query);
  }
}
