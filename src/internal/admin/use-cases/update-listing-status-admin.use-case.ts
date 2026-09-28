import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { AgentService } from '@/internal/domains/agent/agent.service';

@Injectable()
export class UpdateListingStatusAdminUseCase {
  constructor(
    @Inject(forwardRef(() => AgentService))
    private readonly agentService: AgentService,
  ) {}

  async execute(id: number, data: { status: string }) {
    return this.agentService.updateAdminListingStatus(id, data);
  }
}
