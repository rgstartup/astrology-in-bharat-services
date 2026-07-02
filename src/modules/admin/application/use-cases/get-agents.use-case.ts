import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { AgentFacade } from '@/modules/agent/application/agent.facade';

@Injectable()
export class GetAgentsUseCase {
  constructor(
    @Inject(forwardRef(() => AgentFacade))
    private readonly agentFacade: AgentFacade,
  ) {}

  async execute(params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
  }) {
    return this.agentFacade.getAdminAgents(params);
  }
}
