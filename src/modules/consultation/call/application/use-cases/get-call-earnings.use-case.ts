import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CallSession } from '../../infrastructure/entities/call-session.entity';

@Injectable()
export class GetCallEarningsUseCase {
  constructor(
    @InjectRepository(CallSession)
    private readonly callRepository: Repository<CallSession>,
  ) {}

  async execute(dateLimit: Date, type: 'audio' | 'video'): Promise<number> {
    const callStats = (await this.callRepository
      .createQueryBuilder('call')
      .select('SUM(call.final_price)', 'total')
      .where('call.created_at >= :date', { date: dateLimit })
      .andWhere("call.status = 'completed'")
      .andWhere('call.type = :type', { type })
      .getRawOne<{ total: string | null }>()) ?? { total: null };

    return parseFloat(callStats.total ?? '0') || 0;
  }
}
