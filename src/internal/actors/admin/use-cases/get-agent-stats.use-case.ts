import type { DeferredDependency } from '@/shared/types/deferred-dependency.type';
import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { AgentService } from '@/internal/actors/agent/agent.service';

@Injectable()
export class GetAgentStatsUseCase {
  constructor(
    @Inject(forwardRef(() => AgentService))
    private readonly agentService: DeferredDependency<AgentService>,
  ) {}

  async execute() {
    return this.agentService.getAdminAgentStats();
  }
}
