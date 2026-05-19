import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PujaAppointment } from '../../infrastructure/entities/puja-appointment.entity';
import { ProfileExpert } from '@/modules/expert/profile/infrastructure/entities/profile-expert.entity';

@Injectable()
export class GetExpertPujaAppointmentsUseCase {
  constructor(
    @InjectRepository(PujaAppointment)
    private pujaAppointmentRepository: Repository<PujaAppointment>,
    @InjectRepository(ProfileExpert)
    private profileExpertRepository: Repository<ProfileExpert>,
  ) {}

  async execute(userId: number): Promise<PujaAppointment[]> {
    const expert = await this.profileExpertRepository.findOne({
      where: { user_id: userId },
    });

    if (!expert) {
        // If user is not an expert, return empty list instead of throwing
        return [];
    }

    return await this.pujaAppointmentRepository.find({
      where: { expert_id: expert.id },
      relations: ['client', 'client.user', 'puja'],
      order: { created_at: 'DESC' },
    });
  }

  async getRevenueAndCount(expertProfileId: number) {
    const stats = await this.pujaAppointmentRepository
      .createQueryBuilder('puja')
      .select("SUM(puja.price)", "total")
      .addSelect("COUNT(puja.id)", "count")
      .where('puja.expert_id = :id AND puja.status IN (:...statuses)', { 
        id: expertProfileId, 
        statuses: ['accepted', 'confirmed'] 
      })
      .getRawOne();
    return {
      total: parseFloat(stats.total) || 0,
      count: parseInt(stats.count, 10) || 0,
    };
  }
}
