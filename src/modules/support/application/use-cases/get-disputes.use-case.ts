import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Dispute } from '../../infrastructure/entities/dispute.entity';

@Injectable()
export class GetDisputesUseCase {
  constructor(
    @InjectRepository(Dispute)
    private readonly disputeRepo: Repository<Dispute>,
  ) {}

  async execute(profileId: string) {
    return this.disputeRepo
      .createQueryBuilder('dispute')
      .where('dispute.client_id = :profileId OR dispute.expert_id = :profileId', {
        profileId,
      })
      .orderBy('dispute.created_at', 'DESC')
      .getMany();
  }
}
