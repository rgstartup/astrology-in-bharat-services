import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { AgentService } from '@/internal/domains/agent/agent.service';

@Injectable()
export class GetAgentStatsUseCase {
  constructor(
    @Inject(forwardRef(() => AgentService))
    private readonly agentService: AgentService,
  ) {}

  async execute() {
    return this.agentService.getAdminAgentStats();
  }
}
