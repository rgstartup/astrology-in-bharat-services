import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { AgentFacade } from '@/modules/agent/application/agent.facade';

@Injectable()
export class UpdateListingStatusAdminUseCase {
  constructor(
    @Inject(forwardRef(() => AgentFacade))
    private readonly agentFacade: AgentFacade,
  ) {}

  async execute(id: string, data: { status: string }) {
    return this.agentFacade.updateAdminListingStatus(id, data);
  }
}
