import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ExpertDiscoveryService } from '../discovery.service';
import { QueryExpertsDto } from '../dto/query-experts.dto';
import { ExpertDiscoveryResponseDto } from '../dto/expert-discovery-response.dto';

@Controller({ path: 'experts', version: '1' })
export class ExpertDiscoveryController {
  constructor(private readonly discovery: ExpertDiscoveryService) {}

  @Get()
  list(@Query() query: QueryExpertsDto) {
    return this.discovery.list(query);
  }

  @Get('top-rated')
  topRated(@Query('limit') limit = 3) {
    return this.discovery.topRated(Number(limit));
  }

  /**
   * Returns an expert profile with mode-specific reservation requirements.
   * @param id Expert account identifier.
   * @returns Expert profile response with reservation requirements.
   * @throws NotFoundException when the expert does not exist.
   */
  @Get(':id')
  byId(@Param('id', ParseIntPipe) id: number): Promise<ExpertDiscoveryResponseDto> {
    return this.discovery.byId(id);
  }
}
