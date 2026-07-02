import { Controller, Get, Query } from '@nestjs/common';
import { PlacesFacade } from '../../application/places.facade';
import { Public } from '@/common/decorators/public.decorator';

@Controller('places')
export class PlacesController {
  constructor(private readonly placesFacade: PlacesFacade) {}

  @Public()
  @Get('search')
  async search(@Query() allQueries: Record<string, string>) {
    console.log(`\n\n[Places API] === SEARCH REQUEST ===`);
    console.log(`[Places API] Queries received from frontend:`, allQueries);
    const query = allQueries.q || allQueries.query || allQueries.search;
    console.log(`[Places API] Evaluated Search Query string: "${query}"`);

    if (!query) {
      console.log(
        `[Places API] WARNING: Query is empty, returning empty array.`,
      );
      return { places: [] };
    }
    return this.placesFacade.searchPlaces(
      query,
      allQueries.location || 'India',
    );
  }

  @Public()
  @Get('images')
  async getImages(@Query() allQueries: Record<string, string>) {
    console.log(`\n\n[Places API] === IMAGES REQUEST ===`);
    console.log(`[Places API] Queries received from frontend:`, allQueries);
    const query = allQueries.q || allQueries.query || allQueries.search;
    console.log(`[Places API] Evaluated Images Query string: "${query}"`);

    if (!query) {
      console.log(
        `[Places API] WARNING: Query is empty, returning empty array.`,
      );
      return { places: [] };
    }
    return this.placesFacade.getPlaceImages(query);
  }
}
