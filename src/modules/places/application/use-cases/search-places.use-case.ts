import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Place } from '../../infrastructure/entities/place.entity';
import { SerperService } from '@/external/serper/serper.service';
import { PlacesMapper } from '../places.mapper';

@Injectable()
export class SearchPlacesUseCase {
  private readonly logger = new Logger(SearchPlacesUseCase.name);
  private readonly CACHE_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

  constructor(
    @InjectRepository(Place)
    private readonly placeRepository: Repository<Place>,
    private readonly serperService: SerperService,
    private readonly placesMapper: PlacesMapper,
  ) {}

  async execute(query: string, location: string = 'India') {
    const cached = await this.placeRepository.findOne({
      where: { query, location },
    });

    const isFresh =
      cached &&
      Date.now() - cached.last_synced.getTime() < this.CACHE_DURATION_MS &&
      Array.isArray(cached.results);

    if (isFresh) {
      this.logger.log(`Serving cached places for: ${query} in ${location}`);
      return { places: cached.results as unknown[] };
    }

    this.logger.log(`Fetching fresh places for: ${query} in ${location}`);
    const rawResults = await this.serperService.fetchPlaces(query, location);
    this.logger.debug(
      `Raw Serper Response: ${JSON.stringify(rawResults).substring(0, 500)}...`,
    );

    const normalizedResults = this.placesMapper.mapSerperPlaces(
      (rawResults.places as Record<string, unknown>[]) || [],
    );
    this.logger.debug(`Normalized Results Count: ${normalizedResults.length}`);

    if (cached) {
      cached.results = normalizedResults;
      cached.last_synced = new Date();
      await this.placeRepository.save(cached);
    } else {
      const newEntry = this.placeRepository.create({
        query,
        location,
        results: normalizedResults,
      });
      await this.placeRepository.save(newEntry);
    }

    return { places: normalizedResults };
  }
}
