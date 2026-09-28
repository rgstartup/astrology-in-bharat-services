import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PujaAppointment } from './entities/puja-appointment.entity';
import { PujaAppointmentController } from './controllers/puja-appointment.controller';
import { CreatePujaAppointmentUseCase } from './use-cases/create-puja-appointment.use-case';
import { GetUserPujaAppointmentsUseCase } from './use-cases/get-user-puja-appointments.use-case';
import { GetExpertPujaAppointmentsUseCase } from './use-cases/get-expert-puja-appointments.use-case';
import { UpdatePujaAppointmentStatusUseCase } from './use-cases/update-puja-appointment-status.use-case';
import { GetPujaEarningsUseCase } from './use-cases/get-puja-earnings.use-case';
import { GetExpertPujasByDateUseCase } from './use-cases/get-expert-pujas-by-date.use-case';
import { ResolveAppointmentDetailsUseCase } from './use-cases/resolve-appointment-details.use-case';
import { ProfileModule as ExpertProfileModule } from '@/internal/domains/expert/profile/profile.module';
import { NotificationModule } from '@/internal/notification/notification.module';
import { WalletModule } from '@/internal/finance/wallet/wallet.module';
import { TodosModule } from '@/internal/domains/expert/todos/todos.module';
import { ClientAccount } from '@/internal/domains/client/account/entities/account.entity';
import { QueueModule } from '@/core/queue/queue.module';

import { PujaAppointmentService } from './puja-appointment.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([PujaAppointment, ClientAccount]),
    forwardRef(() => ExpertProfileModule),
    NotificationModule,
    forwardRef(() => WalletModule),
    TodosModule,
    QueueModule,
  ],
  controllers: [PujaAppointmentController],
  providers: [
    CreatePujaAppointmentUseCase,
    GetUserPujaAppointmentsUseCase,
    GetExpertPujaAppointmentsUseCase,
    UpdatePujaAppointmentStatusUseCase,
    GetPujaEarningsUseCase,
    GetExpertPujasByDateUseCase,
    ResolveAppointmentDetailsUseCase,
    PujaAppointmentService,
  ],
  exports: [
    PujaAppointmentService,
    GetUserPujaAppointmentsUseCase,
    GetExpertPujaAppointmentsUseCase,
    GetPujaEarningsUseCase,
    GetExpertPujasByDateUseCase,
    ResolveAppointmentDetailsUseCase,
  ],
})
export class PujaAppointmentModule {}
