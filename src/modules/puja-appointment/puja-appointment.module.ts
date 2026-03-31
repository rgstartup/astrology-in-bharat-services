import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PujaAppointment } from './infrastructure/persistence/entities/puja-appointment.entity';
import { PujaAppointmentController } from './api/controllers/puja-appointment.controller';
import { CreatePujaAppointmentUseCase } from './application/use-cases/create-puja-appointment.use-case';
import { GetUserPujaAppointmentsUseCase } from './application/use-cases/get-user-puja-appointments.use-case';
import { GetExpertPujaAppointmentsUseCase } from './application/use-cases/get-expert-puja-appointments.use-case';
import { UpdatePujaAppointmentStatusUseCase } from './application/use-cases/update-puja-appointment-status.use-case';
import { User } from '@/modules/users/infrastructure/persistence/entities/user.entity';
import { ProfileExpert } from '@/modules/expert/profile/infrastructure/persistence/entities/profile-expert.entity';
import { ExpertPuja } from '@/modules/expert/profile/infrastructure/persistence/entities/expert-puja.entity';

import { NotificationModule } from '@/modules/notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PujaAppointment, User, ProfileExpert, ExpertPuja]),
    NotificationModule
  ],
  controllers: [PujaAppointmentController],
  providers: [
    CreatePujaAppointmentUseCase,
    GetUserPujaAppointmentsUseCase,
    GetExpertPujaAppointmentsUseCase,
    UpdatePujaAppointmentStatusUseCase,
  ],
  exports: [GetUserPujaAppointmentsUseCase, GetExpertPujaAppointmentsUseCase],
})
export class PujaAppointmentModule {}
