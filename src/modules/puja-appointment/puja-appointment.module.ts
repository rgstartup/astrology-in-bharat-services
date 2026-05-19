import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PujaAppointment } from './infrastructure/entities/puja-appointment.entity';
import { PujaAppointmentController } from './api/controllers/puja-appointment.controller';
import { CreatePujaAppointmentUseCase } from './application/use-cases/create-puja-appointment.use-case';
import { GetUserPujaAppointmentsUseCase } from './application/use-cases/get-user-puja-appointments.use-case';
import { GetExpertPujaAppointmentsUseCase } from './application/use-cases/get-expert-puja-appointments.use-case';
import { UpdatePujaAppointmentStatusUseCase } from './application/use-cases/update-puja-appointment-status.use-case';
import { User } from '@/modules/users/infrastructure/entities/user.entity';
import { ProfileExpert } from '@/modules/expert/profile/infrastructure/entities/profile-expert.entity';
import { ExpertPuja } from '@/modules/expert/profile/infrastructure/entities/expert-puja.entity';

import { ProfileModule } from '@/modules/expert/profile/profile.module';
import { NotificationModule } from '@/modules/notification/notification.module';
import { WalletModule } from '@/modules/wallet/wallet.module';
import { TodosModule } from '@/modules/expert/todos/todos.module';
import { ProfileClient } from '@/modules/client/profile/infrastructure/entities/profile-client.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([PujaAppointment, User, ProfileExpert, ExpertPuja, ProfileClient]),
    ProfileModule,
    NotificationModule,
    WalletModule,
    TodosModule
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
