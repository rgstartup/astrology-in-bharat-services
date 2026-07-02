import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import {
  CallSession,
  CallSessionStatus,
} from '../../infrastructure/entities/call-session.entity';

@Injectable()
export class GetExpertCallsByDateUseCase {
  constructor(
    @InjectRepository(CallSession)
    private readonly callRepo: Repository<CallSession>,
  ) {}

  async execute(expert_id: string, startDate: Date, endDate: Date) {
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
