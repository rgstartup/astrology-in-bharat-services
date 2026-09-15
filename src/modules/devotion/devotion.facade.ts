import { Injectable } from '@nestjs/common';
import { GetDevotionalRitualsUseCase } from './use-cases/get-devotional-rituals.use-case';
import { GetDevotionalRitualsDto } from './dto/get-devotional-rituals.dto';

@Injectable()
export class DevotionFacade {
  constructor(
    private readonly getDevotionalRitualsUseCase: GetDevotionalRitualsUseCase,
  ) {}

  getRituals(dto: GetDevotionalRitualsDto) {
    return this.getDevotionalRitualsUseCase.execute(dto);
  }

  getRitualById(id: string) {
    return this.getDevotionalRitualsUseCase.getById(id);
  }
}
