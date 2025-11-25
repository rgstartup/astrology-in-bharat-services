import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ExpertsService } from './experts.service';
import { QueryExpertDto } from './profile/dto/query-expert.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';

@Controller('experts')
@UseGuards(JwtAuthGuard)
export class ExpertsController {
  constructor(private readonly expertsService: ExpertsService) {}

  @Get()
  async listExperts(@Query() query: QueryExpertDto) {
    return this.expertsService.listExperts(query);
  }
}
