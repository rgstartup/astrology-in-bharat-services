import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PujaAppointment } from '../../infrastructure/entities/puja-appointment.entity';

@Injectable()
export class GetExpertPujaAppointmentsUseCase {
  constructor(
    @InjectRepository(PujaAppointment)
    private pujaAppointmentRepository: Repository<PujaAppointment>,
  ) {}

  async execute(expertProfileId: string): Promise<PujaAppointment[]> {
    return await this.pujaAppointmentRepository.find({
      where: { expert_id: expertProfileId },
      relations: ['client', 'client.user', 'puja'],
      order: { created_at: 'DESC' },
    });
  }

  async getRevenueAndCount(expertProfileId: string) {
    const stats = (await this.pujaAppointmentRepository
      .createQueryBuilder('puja')
      .select('SUM(puja.price)', 'total')
      .addSelect('COUNT(puja.id)', 'count')
      .where('puja.expert_id = :id AND puja.status IN (:...statuses)', {
        id: expertProfileId,
        statuses: ['accepted', 'confirmed'],
      })
      .getRawOne()) as { total?: string | number; count?: string | number };
    return {
      total: parseFloat(stats.total as string) || 0,
      count: parseInt(stats.count as string, 10) || 0,
    };
  }

  async getAllExpertsRevenueAndCount(): Promise<Record<string, { total: number; count: number }>> {
    const stats = await this.pujaAppointmentRepository
      .createQueryBuilder('puja')
      .select('puja.expert_id', 'expert_id')
      .addSelect('SUM(puja.price)', 'total')
      .addSelect('COUNT(puja.id)', 'count')
      .where('puja.status IN (:...statuses)', { statuses: ['accepted', 'confirmed'] })
      .groupBy('puja.expert_id')
      .getRawMany();

    const result: Record<string, { total: number; count: number }> = {};
    for (const row of stats) {
      if (row.expert_id) {
        result[row.expert_id] = {
          total: parseFloat(row.total || '0'),
          count: parseInt(row.count || '0', 10),
        };
      }
    }
    return result;
  }
}
