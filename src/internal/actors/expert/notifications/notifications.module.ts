import { Module } from '@nestjs/common';
import {
  ClearExpertNotificationsUseCase,
  GetExpertNotificationsUseCase,
  GetExpertNotificationsCountUseCase,
  MarkExpertNotificationAsReadUseCase,
} from './use-cases';
import { ExpertNotificationsController } from './controllers/expert-notifications.controller';
import { ExpertNotificationsService } from './notifications.service';
import { ExpertAuthModule } from '../auth/auth.module';

@Module({
  imports: [ExpertAuthModule],
  controllers: [ExpertNotificationsController],
  providers: [
    ExpertNotificationsService,
    GetExpertNotificationsUseCase,
    GetExpertNotificationsCountUseCase,
    MarkExpertNotificationAsReadUseCase,
    ClearExpertNotificationsUseCase,
  ],
  exports: [ExpertNotificationsService],
})
export class ExpertNotificationsModule {}
