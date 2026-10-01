import { Injectable } from '@nestjs/common';
import { QueryExpertsDto } from './dto/query-experts.dto';
import { QueryExpertsUseCase } from './use-cases/query-experts.usecase';

@Injectable()
export class ExpertDiscoveryService {
  constructor(private readonly queryExperts: QueryExpertsUseCase) {}

  list(query: QueryExpertsDto) {
    return this.queryExperts.list(query);
  }

  topRated(limit = 3) {
    return this.queryExperts.topRated(limit);
  }

  byId(id: number) {
    return this.queryExperts.byId(id);
  }
}
