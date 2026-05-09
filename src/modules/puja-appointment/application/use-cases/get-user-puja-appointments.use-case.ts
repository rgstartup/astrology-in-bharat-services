import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PujaAppointment } from '../../infrastructure/entities/puja-appointment.entity';

@Injectable()
export class GetUserPujaAppointmentsUseCase {
  constructor(
    @InjectRepository(PujaAppointment)
    private pujaAppointmentRepository: Repository<PujaAppointment>,
  ) {}

  async execute(userId: number): Promise<PujaAppointment[]> {
    return await this.pujaAppointmentRepository.find({
      where: { user_id: userId },
      relations: ['expert', 'expert.user', 'puja'],
      order: { created_at: 'DESC' },
    });
  }
}
