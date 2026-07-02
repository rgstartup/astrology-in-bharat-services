import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import {
  PujaAppointment,
  PujaAppointmentStatus,
} from '../../infrastructure/entities/puja-appointment.entity';

@Injectable()
export class GetExpertPujasByDateUseCase {
  constructor(
    @InjectRepository(PujaAppointment)
    private readonly pujaRepo: Repository<PujaAppointment>,
  ) {}

  async execute(expert_id: string, startDate: Date, endDate: Date) {
    return this.pujaRepo.find({
      where: {
        expert_id: expert_id as unknown as string,
        status: PujaAppointmentStatus.CONFIRMED,
        created_at: Between(startDate, endDate),
      },
      relations: ['client', 'client.user', 'puja'],
    });
  }
}
