import { Injectable } from '@nestjs/common';
import { GetUserPujaAppointmentsUseCase } from './use-cases/get-user-puja-appointments.use-case';
import { GetPujaEarningsUseCase } from './use-cases/get-puja-earnings.use-case';
import { GetExpertPujaAppointmentsUseCase } from './use-cases/get-expert-puja-appointments.use-case';

@Injectable()
export class PujaAppointmentFacade {
  constructor(
    private readonly getUserPujaAppointmentsUseCase: GetUserPujaAppointmentsUseCase,
    private readonly getPujaEarningsUseCase: GetPujaEarningsUseCase,
    private readonly getExpertPujaAppointmentsUseCase: GetExpertPujaAppointmentsUseCase,
  ) {}

  getUserAppointments(clientProfileId: string) {
    return this.getUserPujaAppointmentsUseCase.execute(clientProfileId);
  }

  getPujaEarnings(dateLimit: Date) {
    return this.getPujaEarningsUseCase.execute(dateLimit);
  }

  getExpertRevenueAndCount(expertProfileId: string) {
    return this.getExpertPujaAppointmentsUseCase.getRevenueAndCount(
      expertProfileId,
    );
  }
}
