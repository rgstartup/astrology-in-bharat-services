import { Controller, Get, Param, Query } from '@nestjs/common';
import { Public } from '@/common/decorators/public.decorator';
import { DevotionFacade } from '../devotion.facade';
import { GetDevotionalRitualsDto } from '../dto/get-devotional-rituals.dto';

@Controller({
  path: 'devotion/rituals',
  version: '1',
})
export class DevotionalRitualsController {
  constructor(private readonly devotionFacade: DevotionFacade) {}

  @Public()
  @Get()
  async getRituals(@Query() dto: GetDevotionalRitualsDto) {
    return this.devotionFacade.getRituals(dto);
  }

  @Public()
  @Get(':id')
  async getRitualById(@Param('id') id: string) {
    return this.devotionFacade.getRitualById(id);
  }
}
