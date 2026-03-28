import { Module } from '@nestjs/common';
import { PlacesController } from './api/controllers/places.controller';
import { SerperModule } from '@/external/serper/serper.module';

@Module({
  imports: [SerperModule],
  controllers: [PlacesController],
})
export class PlacesModule {}
