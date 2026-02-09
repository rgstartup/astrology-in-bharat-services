import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LiveSession } from './domain/entities/live-session.entity';
import { LiveSessionMessage } from './domain/entities/chat-message.entity';
import { LiveSessionService } from './application/services/live-session.service';
import { LiveSessionGateway } from './infrastructure/gateways/live-session.gateway';
import { LiveSessionAdminController } from './presentation/controllers/live-session.admin.controller';
import { TypeOrmLiveSessionRepository } from './infrastructure/persistence/typeorm-live-session.repository';
import { TypeOrmChatMessageRepository } from './infrastructure/persistence/typeorm-chat-message.repository';
import { ILiveSessionRepository } from './domain/repositories/live-session.repository.interface';
import { IChatMessageRepository } from './domain/repositories/chat-message.repository.interface';

@Module({
    imports: [
        TypeOrmModule.forFeature([LiveSession, LiveSessionMessage]),
    ],
    controllers: [LiveSessionAdminController],
    providers: [
        LiveSessionService,
        LiveSessionGateway,
        {
            provide: ILiveSessionRepository,
            useClass: TypeOrmLiveSessionRepository,
        },
        {
            provide: IChatMessageRepository,
            useClass: TypeOrmChatMessageRepository,
        },
    ],
    exports: [LiveSessionService],
})
export class LiveSessionModule { }
