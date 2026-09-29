import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { CallSession } from '../entities/call-session.entity';
import { CallSessionStatus } from '../enum';

@Injectable()
export class GetExpertCallsByDateUseCase {
  constructor(
    @InjectRepository(CallSession)
    private readonly callRepo: Repository<CallSession>,
  ) {}

  async execute(expert_id: number, startDate: Date, endDate: Date) {
    return this.callRepo.find({
      where: {
        expert_id: expert_id,
        status: CallSessionStatus.COMPLETED,
        created_at: Between(startDate, endDate),
      },
      relations: ['client', 'client.user', 'expert'],
    });
  }
}
