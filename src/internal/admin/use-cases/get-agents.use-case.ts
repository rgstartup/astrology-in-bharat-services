import type { DeferredDependency } from '../../../shared/types/deferred-dependency.type';
import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { AgentService } from '../../domains/agent/agent.service';
import { GetAgentsDto } from '../dto/get-agents.dto';

@Injectable()
export class GetAgentsUseCase {
  constructor(
    @Inject(forwardRef(() => AgentService))
    private readonly agentService: DeferredDependency<AgentService>,
  ) {}

  async execute(dto: GetAgentsDto) {
    const { page, limit, search, status } = dto;
    return this.agentService.getAdminAgents({
      page,
      limit,
      search,
      status,
    });
  }
}
