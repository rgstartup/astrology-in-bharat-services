import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import {
  PujaAppointment,
  PujaAppointmentStatus,
} from '../entities/puja-appointment.entity';

@Injectable()
export class GetExpertPujasByDateUseCase {
  constructor(
    @InjectRepository(PujaAppointment)
    private readonly pujaRepo: Repository<PujaAppointment>,
  ) {}

  async execute(expert_id: number, startDate: Date, endDate: Date) {
    return this.pujaRepo.find({
      where: {
        expert_id,
        status: PujaAppointmentStatus.CONFIRMED,
        created_at: Between(startDate, endDate),
      },
      relations: ['client', 'client.user', 'puja'],
    });
  }
}
