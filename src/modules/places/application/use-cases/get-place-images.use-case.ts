import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlaceImage } from '../../infrastructure/entities/place.entity';
import { SerperService } from '@/external/serper/serper.service';
import { PlacesMapper } from '../places.mapper';

@Injectable()
export class GetPlaceImagesUseCase {
  private readonly logger = new Logger(GetPlaceImagesUseCase.name);
  private readonly CACHE_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

  constructor(
    @InjectRepository(PlaceImage)
    private readonly imageRepository: Repository<PlaceImage>,
    private readonly serperService: SerperService,
    private readonly placesMapper: PlacesMapper,
  ) {}

  async execute(query: string) {
    const cached = await this.imageRepository.findOne({
      where: { query },
    });

    const isFresh =
      cached &&
      Date.now() - cached.last_synced.getTime() < this.CACHE_DURATION_MS &&
      Array.isArray(cached.results);

    if (isFresh) {
      this.logger.log(`Serving cached images for: ${query}`);
      return { places: cached.results as unknown[] };
    }

    this.logger.log(`Fetching fresh images for: ${query}`);
    const rawResults = await this.serperService.fetchImages(query);
    const normalizedResults = this.placesMapper.mapSerperImages(
      (rawResults.images as Record<string, unknown>[]) || [],
    );

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
}
