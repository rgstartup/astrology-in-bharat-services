import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Place, PlaceImage } from '../infrastructure/persistence/entities/place.entity';
import { SerperService } from '@/external/serper/serper.service';
import { PlacesMapper } from './places.mapper';

@Injectable()
export class PlacesService {
  private readonly logger = new Logger(PlacesService.name);
  private readonly CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

  constructor(
    @InjectRepository(Place)
    private readonly placeRepository: Repository<Place>,
    @InjectRepository(PlaceImage)
    private readonly imageRepository: Repository<PlaceImage>,
    private readonly serperService: SerperService,
    private readonly placesMapper: PlacesMapper,
  ) {}

  async searchPlaces(query: string, location: string = 'India') {
    const cached = await this.placeRepository.findOne({
      where: { query, location },
    });

    const isFresh = 
      cached && 
      (Date.now() - cached.last_synced.getTime() < this.CACHE_DURATION_MS) &&
      Array.isArray(cached.results) && 
      cached.results.length > 0;

    if (isFresh) {
      this.logger.log(`Serving cached places for: ${query} in ${location}`);
      return { places: cached.results };
    }

    this.logger.log(`Fetching fresh places for: ${query} in ${location}`);
    const rawResults = await this.serperService.fetchPlaces(query, location);
    this.logger.debug(`Raw Serper Response: ${JSON.stringify(rawResults).substring(0, 500)}...`);
    
    const normalizedResults = this.placesMapper.mapSerperPlaces(rawResults.places || []);
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

  async getPlaceImages(query: string) {
    const cached = await this.imageRepository.findOne({
      where: { query },
    });

    const isFresh = 
      cached && 
      (Date.now() - cached.last_synced.getTime() < this.CACHE_DURATION_MS) &&
      Array.isArray(cached.results) && 
      cached.results.length > 0;

    if (isFresh) {
      this.logger.log(`Serving cached images for: ${query}`);
      return { places: cached.results };
    }

    this.logger.log(`Fetching fresh images for: ${query}`);
    const rawResults = await this.serperService.fetchImages(query);
    const normalizedResults = this.placesMapper.mapSerperImages(rawResults.images || []);

    if (cached) {
      cached.results = normalizedResults;
      cached.last_synced = new Date();
      await this.imageRepository.save(cached);
    } else {
      const newEntry = this.imageRepository.create({
        query,
        results: normalizedResults,
      });
      await this.imageRepository.save(newEntry);
    }

    return { places: normalizedResults };
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleCron() {
    this.logger.log('Starting daily Places cache refresh...');

    // Refresh Places Search Cache
    const allPlaces = await this.placeRepository.find();
    for (const entry of allPlaces) {
      try {
        const rawResults = await this.serperService.fetchPlaces(entry.query, entry.location);
        const normalizedResults = this.placesMapper.mapSerperPlaces(rawResults.places || []);
        entry.results = normalizedResults;
        entry.last_synced = new Date();
        await this.placeRepository.save(entry);
        this.logger.log(`Refreshed places for: ${entry.query} in ${entry.location}`);
      } catch (error) {
        this.logger.error(`Failed to refresh places for ${entry.query}: ${error.message}`);
      }
    }

    // Refresh Images Cache
    const allImages = await this.imageRepository.find();
    for (const entry of allImages) {
      try {
        const rawResults = await this.serperService.fetchImages(entry.query);
        const normalizedResults = this.placesMapper.mapSerperImages(rawResults.images || []);
        entry.results = normalizedResults;
        entry.last_synced = new Date();
        await this.imageRepository.save(entry);
        this.logger.log(`Refreshed images for: ${entry.query}`);
      } catch (error) {
        this.logger.error(`Failed to refresh images for ${entry.query}: ${error.message}`);
      }
    }

    this.logger.log('Places cache refresh completed.');
  }
}
