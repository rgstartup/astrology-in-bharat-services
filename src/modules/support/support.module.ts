import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Dispute } from './infrastructure/persistence/entities/dispute.entity';
import { DisputeMessage } from './infrastructure/persistence/entities/dispute-message.entity';
import { SupportFacade } from './application/support.facade';
import { GetDisputesUseCase } from './application/use-cases/get-disputes.use-case';
import { CreateDisputeUseCase } from './application/use-cases/create-dispute.use-case';
import { GetDisputeByIdUseCase } from './application/use-cases/get-dispute-by-id.use-case';
import { SendDisputeMessageUseCase } from './application/use-cases/send-message.use-case';
import { GetDisputeMessagesUseCase } from './application/use-cases/get-messages.use-case';
import { MarkMessagesAsReadUseCase } from './application/use-cases/mark-as-read.use-case';
import { GetAllDisputesUseCase } from './application/use-cases/get-all-disputes.use-case';
import { UpdateDisputeStatusUseCase } from './application/use-cases/update-dispute-status.use-case';
import { SupportController } from './api/controllers/support.controller';
import { SupportGateway } from './api/support.gateway';

@Module({
    imports: [TypeOrmModule.forFeature([Dispute, DisputeMessage])],
    providers: [
        SupportFacade,
        SupportGateway,
        GetDisputesUseCase,
        CreateDisputeUseCase,
        GetDisputeByIdUseCase,
        SendDisputeMessageUseCase,
        GetDisputeMessagesUseCase,
        MarkMessagesAsReadUseCase,
        GetAllDisputesUseCase,
        UpdateDisputeStatusUseCase
    ],
    controllers: [SupportController],
    exports: [SupportFacade],
})
export class SupportModule { }
