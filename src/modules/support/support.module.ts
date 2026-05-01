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
import { SupportController } from './api/controllers/support.controller';
import { UsersModule } from '@/modules/users/users.module';

@Module({
    imports: [TypeOrmModule.forFeature([Dispute, DisputeMessage]), UsersModule],
    providers: [
        SupportFacade,
        GetDisputesUseCase,
        CreateDisputeUseCase,
        GetDisputeByIdUseCase,
        SendDisputeMessageUseCase,
        GetDisputeMessagesUseCase,
        MarkMessagesAsReadUseCase
    ],
    controllers: [SupportController],
    exports: [SupportFacade],
})
export class SupportModule { }
