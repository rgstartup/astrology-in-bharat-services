import { Controller, Get, Query } from '@nestjs/common';
import { SerperService } from '@/external/serper/serper.service';
import { Public } from '@/common/decorators/public.decorator';

@Controller('places')
export class PlacesController {
  constructor(private readonly serperService: SerperService) {}

  @Public()
  @Get('search')
  async search(@Query('q') query: string, @Query('location') location: string) {
    return this.serperService.fetchPlaces(query, location);
  }

  @Public()
  @Get('images')
  async getImages(@Query('q') query: string) {
    return this.serperService.fetchImages(query);
  }
}
