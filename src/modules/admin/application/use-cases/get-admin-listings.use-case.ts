import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { AgentFacade } from '@/modules/agent/application/agent.facade';
import { GetAdminListingsDto } from '../../api/dto/get-listings.dto';

@Injectable()
export class GetAdminListingsUseCase {
  constructor(
    @Inject(forwardRef(() => AgentFacade))
    private readonly agentFacade: AgentFacade,
  ) {}

  async execute(dto?: GetAdminListingsDto) {
    const { type, search, page, limit } = dto || {};
    return this.agentFacade.getAdminListings({
      type,
      search,
      page,
      limit,
    });
  }
}

