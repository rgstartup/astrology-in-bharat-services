import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { AgentFacade } from '@/modules/agent/application/agent.facade';
import { GetAgentsDto } from '../../api/dto/get-agents.dto';

@Injectable()
export class GetAgentsUseCase {
  constructor(
    @Inject(forwardRef(() => AgentFacade))
    private readonly agentFacade: AgentFacade,
  ) {}

  async execute(dto: GetAgentsDto) {
    const { page, limit, search, status } = dto;
    return this.agentFacade.getAdminAgents({
      page,
      limit,
      search,
      status,
    });
  }
}

