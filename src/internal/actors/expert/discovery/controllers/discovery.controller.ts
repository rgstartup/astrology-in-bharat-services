import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ExpertDiscoveryService } from '../discovery.service';
import { QueryExpertsDto } from '../dto/query-experts.dto';

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

  @Get(':id')
  byId(@Param('id', ParseIntPipe) id: number) {
    return this.discovery.byId(id);
  }
}
