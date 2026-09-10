import { Controller, Get, Query } from '@nestjs/common';
import { Public } from '@/common/decorators/public.decorator';
import { GetConsultationTopicsUseCase } from '../use-cases/get-consultation-topics.use-case';
import { GetConsultationTopicsDto } from '../dto/get-consultation-topics.dto';

@Controller({
  path: 'consultation-topics',
  version: '1',
})
export class ConsultationTopicController {
  constructor(
    private readonly getConsultationTopicsUseCase: GetConsultationTopicsUseCase,
  ) {}

  @Public()
  @Get()
  async getTopics(@Query() dto: GetConsultationTopicsDto) {
    return this.getConsultationTopicsUseCase.execute(dto);
  }
}
