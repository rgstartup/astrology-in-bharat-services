import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlaceImage } from '../../infrastructure/entities/place.entity';
import { SerperService } from '@/external/serper/serper.service';
import { PlacesMapper } from '../places.mapper';

@Injectable()
export class RefreshPlaceImagesCacheUseCase {
  private readonly logger = new Logger(RefreshPlaceImagesCacheUseCase.name);

  constructor(
    @InjectRepository(PlaceImage)
    private readonly imageRepository: Repository<PlaceImage>,
    private readonly serperService: SerperService,
    private readonly placesMapper: PlacesMapper,
  ) {}

  async execute() {
    this.logger.log('Starting weekly Places image cache cleanup...');
    try {
      await this.imageRepository.clear(); // Truncates the table to clear all cached images
      this.logger.log('Successfully cleared all cached images to fetch fresh data on next search.');
    } catch (error) {
      this.logger.error(`Failed to clear image cache: ${(error as Error).message}`);
    }
  }
}
