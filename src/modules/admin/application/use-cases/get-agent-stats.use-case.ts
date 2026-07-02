import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { AgentFacade } from '@/modules/agent/application/agent.facade';

@Injectable()
export class GetAgentStatsUseCase {
  constructor(
    @Inject(forwardRef(() => AgentFacade))
    private readonly agentFacade: AgentFacade,
  ) {}

  async execute() {
    return this.agentFacade.getAdminAgentStats();
  }
}
