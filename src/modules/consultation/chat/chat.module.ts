import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatSession } from './infrastructure/entities/chat-session.entity';
import { ChatMessage } from './infrastructure/entities/chat-message.entity';
import { ChatGateway } from './chat.gateway';
import { ChatController } from './api/controllers/chat.controller';
import { ConsultationController } from './api/controllers/consultation.controller';
import { ChatFacade } from './application/chat.facade';
import { InitiateChatUseCase } from './application/use-cases/initiate-chat.use-case';
import { ActivateSessionUseCase } from './application/use-cases/activate-session.use-case';
import { EndChatUseCase } from './application/use-cases/end-chat.use-case';
import { ExpireSessionUseCase } from './application/use-cases/expire-session.use-case';
import { GetSessionUseCase } from './application/use-cases/get-session.use-case';
import { GetMessagesUseCase } from './application/use-cases/get-messages.use-case';
import { SaveMessageUseCase } from './application/use-cases/save-message.use-case';
import { ConvertToPaidUseCase } from './application/use-cases/convert-to-paid.use-case';
import { FindExpertSessionsUseCase } from './application/use-cases/find-expert-sessions.use-case';
import { FindClientSessionsUseCase } from './application/use-cases/find-client-sessions.use-case';
import { FindActiveClientSessionUseCase } from './application/use-cases/find-active-client-session.use-case';
import { GetTotalSessionsCountUseCase } from './application/use-cases/get-total-sessions-count.use-case';
import { CountExpertSessionsUseCase } from './application/use-cases/count-expert-sessions.use-case';
import { FindAllSessionsUseCase } from './application/use-cases/find-all-sessions.use-case';
import { AdminTerminateSessionUseCase } from './application/use-cases/admin-terminate-session.use-case';
import { GetChatSessionStatsUseCase } from './application/use-cases/get-chat-session-stats.use-case';
import { RejectChatUseCase } from './application/use-cases/reject-chat.use-case';
import { UpdateSessionMetadataUseCase } from './application/use-cases/update-session-metadata.use-case';

import { WalletModule } from '@/modules/wallet/wallet.module';
import { ProfileExpert } from '@/modules/expert/profile/infrastructure/entities/profile-expert.entity';
import { NotificationModule } from '@/modules/notification/notification.module';
import { CouponModule } from '@/modules/commerce/coupon/coupon.module';

import { User } from '@/modules/users/infrastructure/entities/user.entity';
import { ProfileClient } from '@/modules/client/profile/infrastructure/entities/profile-client.entity';
@Module({
  imports: [
    TypeOrmModule.forFeature([ChatSession, ChatMessage, ProfileExpert, ProfileClient, User]),
    WalletModule,
    NotificationModule,
    CouponModule,
  ],
  providers: [
    ChatGateway,
    ChatFacade,
    InitiateChatUseCase,
    ActivateSessionUseCase,
    EndChatUseCase,
    ExpireSessionUseCase,
    GetSessionUseCase,
    GetMessagesUseCase,
    SaveMessageUseCase,
    ConvertToPaidUseCase,
    FindExpertSessionsUseCase,
    FindClientSessionsUseCase,
    FindActiveClientSessionUseCase,
    GetTotalSessionsCountUseCase,
    CountExpertSessionsUseCase,
    FindAllSessionsUseCase,
    AdminTerminateSessionUseCase,
    GetChatSessionStatsUseCase,
    RejectChatUseCase,
    UpdateSessionMetadataUseCase,
  ],
  controllers: [ChatController, ConsultationController],
  exports: [ChatFacade, FindAllSessionsUseCase, AdminTerminateSessionUseCase, GetChatSessionStatsUseCase, RejectChatUseCase],
})
export class ChatModule { }
