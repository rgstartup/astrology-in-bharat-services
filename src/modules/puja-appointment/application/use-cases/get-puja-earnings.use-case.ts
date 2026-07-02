import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PujaAppointment } from '../../infrastructure/entities/puja-appointment.entity';

@Injectable()
export class GetPujaEarningsUseCase {
  constructor(
    @InjectRepository(PujaAppointment)
    private readonly pujaRepository: Repository<PujaAppointment>,
  ) {}

  async execute(dateLimit: Date): Promise<number> {
    const pujaStats = (await this.pujaRepository
      .createQueryBuilder('puja')
      .select('SUM(puja.price)', 'total')
      .where('puja.created_at >= :date', { date: dateLimit })
      .andWhere("puja.status IN ('accepted', 'confirmed')")
      .getRawOne()) as { total?: string | number };

    return parseFloat(pujaStats?.total as string) || 0;
  }
}
