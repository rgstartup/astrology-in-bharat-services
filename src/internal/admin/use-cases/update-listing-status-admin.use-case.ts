import type { DeferredDependency } from '../../../shared/types/deferred-dependency.type';
import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { AgentService } from '../../domains/agent/agent.service';

@Injectable()
export class UpdateListingStatusAdminUseCase {
  constructor(
    @Inject(forwardRef(() => AgentService))
    private readonly agentService: DeferredDependency<AgentService>,
  ) {}

  async execute(id: number, data: { status: string }) {
    return this.agentService.updateAdminListingStatus(id, data);
  }
}
