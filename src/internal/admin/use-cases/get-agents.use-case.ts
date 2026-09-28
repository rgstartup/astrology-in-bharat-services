import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { AgentService } from '@/internal/domains/agent/agent.service';
import { GetAgentsDto } from '../dto/get-agents.dto';

@Injectable()
export class GetAgentsUseCase {
  constructor(
    @Inject(forwardRef(() => AgentService))
    private readonly agentService: AgentService,
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
