import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { AgentService } from '@/internal/domains/agent/agent.service';
import { GetAdminListingsDto } from '../dto/get-listings.dto';

@Injectable()
export class GetAdminListingsUseCase {
  constructor(
    @Inject(forwardRef(() => AgentService))
    private readonly agentService: AgentService,
  ) {}

  async execute(dto?: GetAdminListingsDto) {
    const { type, search, page, limit } = dto || {};
    return this.agentService.getAdminListings({
      type,
      search,
      page,
      limit,
    });
  }
}
