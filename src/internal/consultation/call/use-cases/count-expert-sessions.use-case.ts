import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, MoreThanOrEqual, FindOptionsWhere } from 'typeorm';
import { CallSession } from '../entities/call-session.entity';
import { CallSessionStatus } from '../enum';

@Injectable()
export class CountExpertCallSessionsUseCase {
  constructor(
    @InjectRepository(CallSession)
    private readonly callSessionRepo: Repository<CallSession>,
  ) {}

  async execute(
    expert_id: number,
    options: {
      status?: CallSessionStatus | CallSessionStatus[];
      startDate?: Date;
    } = {},
  ) {
    const where: FindOptionsWhere<CallSession> = {
      expert_id,
    };

    if (options.status) {
      if (Array.isArray(options.status)) {
        where.status = In(options.status);
      } else {
        where.status = options.status;
      }
    }

    if (options.startDate) {
      where.created_at = MoreThanOrEqual(options.startDate);
    }

    return this.callSessionRepo.count({ where });
  }
}
