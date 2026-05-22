import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExpertPuja } from '../../../infrastructure/entities/expert-puja.entity';

@Injectable()
export class GetPujaByIdUseCase {
  constructor(
    @InjectRepository(ExpertPuja)
    private readonly pujaRepo: Repository<ExpertPuja>,
  ) {}

  async execute(id: string) {
    const puja = await this.pujaRepo.findOne({
      where: { id },
      relations: ['expert', 'expert.user'],
    });

    if (!puja) {
      throw new NotFoundException(`Puja with ID ${id} not found`);
    }

    return puja;
  }
}
