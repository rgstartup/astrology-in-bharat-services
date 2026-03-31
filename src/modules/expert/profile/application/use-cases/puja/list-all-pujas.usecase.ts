import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExpertPuja } from '../../../infrastructure/persistence/entities/expert-puja.entity';

@Injectable()
export class ListAllPujasUseCase {
  constructor(
    @InjectRepository(ExpertPuja)
    private readonly pujaRepo: Repository<ExpertPuja>,
  ) {}

  async execute() {
    try {
      return await this.pujaRepo.find({
        relations: ['expert', 'expert.user'],
        order: {
          id: 'DESC',
        },
      });
    } catch (error) {
      console.error('[ListAllPujasUseCase] ERROR fetching pujas:', error);
      throw error;
    }
  }
}
