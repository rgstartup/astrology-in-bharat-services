import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CallSession } from '../../infrastructure/entities/call-session.entity';

@Injectable()
export class GetAgentTotalCommissionUseCase {
  constructor(
    @InjectRepository(CallSession)
    private readonly callSessionRepo: Repository<CallSession>,
  ) {}

  async execute(agentId: string): Promise<number> {
    const result = (await this.callSessionRepo
      .createQueryBuilder('call')
      .select('SUM(call.agent_commission)', 'total')
      .where('call.agent_id = :agentId', { agentId })
      .getRawOne()) as { total: string | number | null } | undefined;

    return Number(result?.total || 0);
  }
}
