import { Module } from '@nestjs/common';
import { AstrologyController } from './api/astrology.controller';
import { ProkeralaModule } from '@/external/prokerala/prokerala.module';

@Module({
  imports: [ProkeralaModule],
  controllers: [AstrologyController],
})
export class AstrologyModule {}
