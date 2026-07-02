import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Place } from '../../infrastructure/entities/place.entity';
import { SerperService } from '@/external/serper/serper.service';
import { PlacesMapper } from '../places.mapper';

@Injectable()
export class RefreshPlaceSearchCacheUseCase {
  private readonly logger = new Logger(RefreshPlaceSearchCacheUseCase.name);

  constructor(
    @InjectRepository(Place)
    private readonly placeRepository: Repository<Place>,
    private readonly serperService: SerperService,
    private readonly placesMapper: PlacesMapper,
  ) {}

  async execute() {
    this.logger.log('Starting weekly Places search cache cleanup...');
    try {
      await this.placeRepository.clear(); // Truncates the table to clear all cached places
      this.logger.log('Successfully cleared all cached places to fetch fresh data on next search.');
    } catch (error) {
      this.logger.error(`Failed to clear places cache: ${(error as Error).message}`);
    }
  }
}
