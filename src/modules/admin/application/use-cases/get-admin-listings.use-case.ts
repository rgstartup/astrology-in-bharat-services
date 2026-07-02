import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { AgentFacade } from '@/modules/agent/application/agent.facade';

@Injectable()
export class GetAdminListingsUseCase {
  constructor(
    @Inject(forwardRef(() => AgentFacade))
    private readonly agentFacade: AgentFacade,
  ) {}

  async execute(params?: {
    type?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    return this.agentFacade.getAdminListings(params || {});
  }
}
