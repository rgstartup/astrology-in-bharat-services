import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DevotionalRitual } from './entities/devotional-ritual.entity';
import { DevotionalRitualsController } from './controllers/devotional-rituals.controller';
import { DevotionFacade } from './devotion.facade';
import { GetDevotionalRitualsUseCase } from './use-cases/get-devotional-rituals.use-case';

@Module({
  imports: [TypeOrmModule.forFeature([DevotionalRitual])],
  controllers: [DevotionalRitualsController],
  providers: [DevotionFacade, GetDevotionalRitualsUseCase],
  exports: [DevotionFacade, TypeOrmModule],
})
export class DevotionModule {}
