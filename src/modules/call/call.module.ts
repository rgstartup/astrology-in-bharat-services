import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CallSession } from './infrastructure/persistence/entities/call-session.entity';
import { TwilioService } from './infrastructure/services/twilio.service';
import { ProfileExpert } from '@/modules/expert/profile/infrastructure/persistence/entities/profile-expert.entity';
import { WalletModule } from '@/modules/wallet/wallet.module';
import { NotificationModule } from '@/modules/notification/notification.module';
import { InitiateCallUseCase } from './application/use-cases/initiate-call.use-case';
import { AcceptCallUseCase } from './application/use-cases/accept-call.use-case';
import { EndCallUseCase } from './application/use-cases/end-call.use-case';
import { GetExpertCallSessionsUseCase } from './application/use-cases/get-expert-sessions.use-case';
import { GetCallSessionUseCase } from './application/use-cases/get-call-session.use-case';
import { GetCallTokenUseCase } from './application/use-cases/get-call-token.use-case';
import { CallController } from './api/controllers/call.controller';
import { TwimlController } from './api/controllers/twiml.controller';
import { CallGateway } from './call.gateway';
import { CallFacade } from './application/call.facade';

@Module({
    imports: [
        TypeOrmModule.forFeature([CallSession, ProfileExpert]),
        WalletModule,
        NotificationModule,
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
        CallGateway,
    ],
    exports: [CallFacade, TwilioService, CallGateway],
})
export class CallModule { }
