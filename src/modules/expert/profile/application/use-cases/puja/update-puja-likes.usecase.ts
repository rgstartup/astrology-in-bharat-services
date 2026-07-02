import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExpertPuja } from '../../../infrastructure/entities/expert-puja.entity';

@Injectable()
export class UpdatePujaLikesUseCase {
  constructor(
    @InjectRepository(ExpertPuja)
    private readonly pujaRepository: Repository<ExpertPuja>,
  ) {}

  async execute(pujaId: string, diff: number): Promise<void> {
    const puja = await this.pujaRepository.findOne({ where: { id: pujaId } });
    if (!puja) {
      throw new NotFoundException('Puja not found');
    }
    puja.total_likes = Math.max(0, (puja.total_likes || 0) + diff);
    await this.pujaRepository.save(puja);
  }
}
