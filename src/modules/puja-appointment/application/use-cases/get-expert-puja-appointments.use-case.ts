import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PujaAppointment } from '../../infrastructure/persistence/entities/puja-appointment.entity';
import { ProfileExpert } from '@/modules/expert/profile/infrastructure/persistence/entities/profile-expert.entity';

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
      relations: ['user', 'puja'],
      order: { created_at: 'DESC' },
    });
  }
}
