import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Dispute } from './domain/entities/dispute.entity';
import { DisputeMessage } from './domain/entities/dispute-message.entity';
import { SupportService } from './application/services/support.service';
import { DisputeChatService } from './application/services/dispute-chat.service';
import { SupportController } from './interfaces/controllers/support.controller';
import { AdminSupportController } from './interfaces/controllers/admin-support.controller';
import { IDisputeRepository } from './domain/repositories/dispute.repository.interface';
import { IDisputeMessageRepository } from './domain/repositories/dispute-message.repository.interface';
import { TypeOrmDisputeRepository } from './infrastructure/persistence/typeorm-dispute.repository';
import { TypeOrmDisputeMessageRepository } from './infrastructure/persistence/typeorm-dispute-message.repository';

import { DisputeChatGateway } from './interfaces/gateways/dispute-chat.gateway';

import { User } from '@/modules/users/domain/entities/user.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Dispute, DisputeMessage, User])],
    controllers: [SupportController, AdminSupportController],
    providers: [
        SupportService,
        DisputeChatService,
        DisputeChatGateway,
        {
            provide: IDisputeRepository,
            useClass: TypeOrmDisputeRepository,
        },
        {
            provide: IDisputeMessageRepository,
            useClass: TypeOrmDisputeMessageRepository,
        },
    ],
    exports: [SupportService, DisputeChatService],
})
export class SupportModule { }
