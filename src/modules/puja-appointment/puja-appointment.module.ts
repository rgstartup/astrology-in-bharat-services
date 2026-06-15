import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PujaAppointment } from './infrastructure/entities/puja-appointment.entity';
import { PujaAppointmentController } from './api/controllers/puja-appointment.controller';
import { CreatePujaAppointmentUseCase } from './application/use-cases/create-puja-appointment.use-case';
import { GetUserPujaAppointmentsUseCase } from './application/use-cases/get-user-puja-appointments.use-case';
import { GetExpertPujaAppointmentsUseCase } from './application/use-cases/get-expert-puja-appointments.use-case';
import { UpdatePujaAppointmentStatusUseCase } from './application/use-cases/update-puja-appointment-status.use-case';
import { GetPujaEarningsUseCase } from './application/use-cases/get-puja-earnings.use-case';
import { GetExpertPujasByDateUseCase } from './application/use-cases/get-expert-pujas-by-date.use-case';
import { ProfileModule as ExpertProfileModule } from '@/modules/expert/profile/profile.module';
import { NotificationModule } from '@/modules/notification/notification.module';
import { WalletModule } from '@/modules/wallet/wallet.module';
import { TodosModule } from '@/modules/expert/todos/todos.module';
import { ProfileClient } from '@/modules/client/profile/infrastructure/entities/profile-client.entity';

import { PujaAppointmentFacade } from './application/puja-appointment.facade';

@Module({
  imports: [
    TypeOrmModule.forFeature([PujaAppointment, ProfileClient]),
    forwardRef(() => ExpertProfileModule),
    NotificationModule,
    forwardRef(() => WalletModule),
    TodosModule,
  ],
  controllers: [PujaAppointmentController],
  providers: [
    CreatePujaAppointmentUseCase,
    GetUserPujaAppointmentsUseCase,
    GetExpertPujaAppointmentsUseCase,
    UpdatePujaAppointmentStatusUseCase,
    GetPujaEarningsUseCase,
    GetExpertPujasByDateUseCase,
    PujaAppointmentFacade,
  ],
  exports: [
    PujaAppointmentFacade,
    GetUserPujaAppointmentsUseCase,
    GetExpertPujaAppointmentsUseCase,
    GetPujaEarningsUseCase,
    GetExpertPujasByDateUseCase,
  ],
})
export class PujaAppointmentModule {}
