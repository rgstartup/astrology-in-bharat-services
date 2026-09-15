import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Dispute } from './entities/dispute.entity';
import { DisputeMessage } from './entities/dispute-message.entity';
import { SupportFacade } from './support.facade';
import { GetDisputesUseCase } from './use-cases/get-disputes.use-case';
import { CreateDisputeUseCase } from './use-cases/create-dispute.use-case';
import { GetDisputeByIdUseCase } from './use-cases/get-dispute-by-id.use-case';
import { SendDisputeMessageUseCase } from './use-cases/send-message.use-case';
import { GetDisputeMessagesUseCase } from './use-cases/get-messages.use-case';
import { MarkMessagesAsReadUseCase } from './use-cases/mark-as-read.use-case';
import { GetAllDisputesUseCase } from './use-cases/get-all-disputes.use-case';
import { UpdateDisputeStatusUseCase } from './use-cases/update-dispute-status.use-case';
import { SupportController } from './controllers/support.controller';
import { SupportGateway } from './gateways/support.gateway';

import { WalletModule } from '../finance/wallet/wallet.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [TypeOrmModule.forFeature([Dispute, DisputeMessage]), forwardRef(() => WalletModule), NotificationModule],
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
    UpdateDisputeStatusUseCase,
  ],
  controllers: [SupportController],
  exports: [SupportFacade, SupportGateway],
})
export class SupportModule {}
