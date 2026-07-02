import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CallSession } from './infrastructure/entities/call-session.entity';
import { TwilioService } from './infrastructure/services/twilio.service';
import { WalletModule } from '@/modules/wallet/wallet.module';
import { NotificationModule } from '@/modules/notification/notification.module';
import { ProfileModule as ExpertProfileModule } from '@/modules/expert/profile/profile.module';
import { InitiateCallUseCase } from './application/use-cases/initiate-call.use-case';
import { AcceptCallUseCase } from './application/use-cases/accept-call.use-case';
import { EndCallUseCase } from './application/use-cases/end-call.use-case';
import { GetExpertCallSessionsUseCase } from './application/use-cases/get-expert-sessions.use-case';
import { GetCallSessionUseCase } from './application/use-cases/get-call-session.use-case';
import { GetCallTokenUseCase } from './application/use-cases/get-call-token.use-case';
import { RejectCallUseCase } from './application/use-cases/reject-call.use-case';
import { GetCallEarningsUseCase } from './application/use-cases/get-call-earnings.use-case';
import { CountExpertCallSessionsUseCase } from './application/use-cases/count-expert-sessions.use-case';
import { GetExpertCallsByDateUseCase } from './application/use-cases/get-expert-calls-by-date.use-case';

import { CallController } from './api/controllers/call.controller';
import { TwimlController } from './api/controllers/twiml.controller';
import { CallGateway } from './call.gateway';
import { CallFacade } from './application/call.facade';

@Module({
  imports: [
    TypeOrmModule.forFeature([CallSession]),
    forwardRef(() => WalletModule),
    NotificationModule,
    forwardRef(() => ExpertProfileModule),
  ],
  controllers: [CallController, TwimlController],
  providers: [
    CallFacade,
    TwilioService,
    InitiateCallUseCase,
    AcceptCallUseCase,
    EndCallUseCase,
    GetExpertCallSessionsUseCase,
    GetCallSessionUseCase,
    GetCallTokenUseCase,
    RejectCallUseCase,
    GetCallEarningsUseCase,
    CountExpertCallSessionsUseCase,
    GetExpertCallsByDateUseCase,
    CallGateway,
  ],
  exports: [
    CallFacade,
    TwilioService,
    CallGateway,
    RejectCallUseCase,
    GetCallEarningsUseCase,
  ],
})
export class CallModule {}
