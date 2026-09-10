import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CallSession } from './entities/call-session.entity';
import { TwilioService } from './services/twilio.service';
import { WalletModule } from '@/modules/finance/wallet/wallet.module';
import { NotificationModule } from '@/modules/notification/notification.module';
import { ProfileModule as ExpertProfileModule } from '@/modules/expert/profile/profile.module';
import { QueueModule } from '@/core/queue/queue.module';
import { InitiateCallUseCase } from './use-cases/initiate-call.use-case';
import { AcceptCallUseCase } from './use-cases/accept-call.use-case';
import { EndCallUseCase } from './use-cases/end-call.use-case';
import { GetExpertCallSessionsUseCase } from './use-cases/get-expert-sessions.use-case';
import { GetCallSessionUseCase } from './use-cases/get-call-session.use-case';
import { GetCallTokenUseCase } from './use-cases/get-call-token.use-case';
import { RejectCallUseCase } from './use-cases/reject-call.use-case';
import { GetCallEarningsUseCase } from './use-cases/get-call-earnings.use-case';
import { CountExpertCallSessionsUseCase } from './use-cases/count-expert-sessions.use-case';
import { GetExpertCallsByDateUseCase } from './use-cases/get-expert-calls-by-date.use-case';
import { ConvertToPaidUseCase } from './use-cases/convert-to-paid.use-case';
import { ResolveSessionDetailsUseCase } from './use-cases/resolve-session-details.use-case';

import { CallController } from './controllers/call.controller';
import { TwimlController } from './controllers/twiml.controller';
import { CallGateway } from './call.gateway';
import { CallFacade } from './call.facade';

@Module({
  imports: [
    TypeOrmModule.forFeature([CallSession]),
    forwardRef(() => WalletModule),
    NotificationModule,
    forwardRef(() => ExpertProfileModule),
    QueueModule,
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
    ConvertToPaidUseCase,
    ResolveSessionDetailsUseCase,
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
