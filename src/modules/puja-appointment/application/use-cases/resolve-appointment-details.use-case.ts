import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { PujaAppointment } from '../../infrastructure/entities/puja-appointment.entity';

@Injectable()
export class ResolveAppointmentDetailsUseCase {
  constructor(
    @InjectRepository(PujaAppointment)
    private readonly pujaAppointmentRepo: Repository<PujaAppointment>,
  ) {}

  async execute(appointmentIds: string[]): Promise<Record<string, { expertName: string, type: string }>> {
    if (!appointmentIds || appointmentIds.length === 0) return {};
    
    const appointments = await this.pujaAppointmentRepo.find({
      where: { id: In(appointmentIds) },
      relations: ['expert', 'expert.user'],
    });

    const result: Record<string, { expertName: string, type: string }> = {};
    for (const app of appointments) {
      result[app.id] = {
        expertName: app.expert?.user?.name || 'Expert',
        type: 'puja_service',
      };
    }
    return result;
  }
}
