import { Controller, Get, Query } from '@nestjs/common';
import { PlacesService } from '../../application/places.service';
import { Public } from '@/common/decorators/public.decorator';

@Controller('places')
export class PlacesController {
  constructor(private readonly placesService: PlacesService) {}

  @Public()
  @Get('search')
  async search(@Query() allQueries: any) {
    console.log(`\n\n[Places API] === SEARCH REQUEST ===`);
    console.log(`[Places API] Queries received from frontend:`, allQueries);
    const query = allQueries.q || allQueries.query || allQueries.search;
    console.log(`[Places API] Evaluated Search Query string: "${query}"`);
    
    if (!query) {
      console.log(`[Places API] WARNING: Query is empty, returning empty array.`);
      return { places: [] };
    }
    return this.placesService.searchPlaces(query, allQueries.location || 'India');
  }

  @Public()
  @Get('images')
  async getImages(@Query() allQueries: any) {
    console.log(`\n\n[Places API] === IMAGES REQUEST ===`);
    console.log(`[Places API] Queries received from frontend:`, allQueries);
    const query = allQueries.q || allQueries.query || allQueries.search;
    console.log(`[Places API] Evaluated Images Query string: "${query}"`);

    if (!query) {
      console.log(`[Places API] WARNING: Query is empty, returning empty array.`);
      return { places: [] };
    }
    return this.placesService.getPlaceImages(query);
  }
}
