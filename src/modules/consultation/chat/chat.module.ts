import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatSession } from './entities/chat-session.entity';
import { ChatMessage } from './entities/chat-message.entity';
import { ChatGateway } from './chat.gateway';
import { ChatController } from './controllers/chat.controller';
import { ConsultationController } from './controllers/consultation.controller';
import { ChatFacade } from './chat.facade';
import { InitiateChatUseCase } from './use-cases/initiate-chat.use-case';
import { ActivateSessionUseCase } from './use-cases/activate-session.use-case';
import { EndChatUseCase } from './use-cases/end-chat.use-case';
import { ExpireSessionUseCase } from './use-cases/expire-session.use-case';
import { GetSessionUseCase } from './use-cases/get-session.use-case';
import { GetMessagesUseCase } from './use-cases/get-messages.use-case';
import { SaveMessageUseCase } from './use-cases/save-message.use-case';
import { ConvertToPaidUseCase } from './use-cases/convert-to-paid.use-case';
import { FindExpertSessionsUseCase } from './use-cases/find-expert-sessions.use-case';
import { FindClientSessionsUseCase } from './use-cases/find-client-sessions.use-case';
import { FindActiveClientSessionUseCase } from './use-cases/find-active-client-session.use-case';
import { GetTotalSessionsCountUseCase } from './use-cases/get-total-sessions-count.use-case';
import { CountExpertSessionsUseCase } from './use-cases/count-expert-sessions.use-case';
import { FindAllSessionsUseCase } from './use-cases/find-all-sessions.use-case';
import { AdminTerminateSessionUseCase } from './use-cases/admin-terminate-session.use-case';
import { GetChatSessionStatsUseCase } from './use-cases/get-chat-session-stats.use-case';
import { RejectChatUseCase } from './use-cases/reject-chat.use-case';
import { UpdateSessionMetadataUseCase } from './use-cases/update-session-metadata.use-case';
import { GetChatEarningsUseCase } from './use-cases/get-chat-earnings.use-case';
import { GetExpertSessionsByDateUseCase } from './use-cases/get-expert-sessions-by-date.use-case';
import { CheckChatEligibilityUseCase } from './use-cases/check-chat-eligibility.use-case';
import { ResolveSessionDetailsUseCase } from './use-cases/resolve-session-details.use-case';

import { WalletModule } from '@/modules/finance/wallet/wallet.module';
import { NotificationModule } from '@/modules/notification/notification.module';
import { CouponModule } from '@/modules/client/commerce/coupon/coupon.module';
import { ProfileModule as ExpertProfileModule } from '@/modules/expert/profile/profile.module';
import { QueueModule } from '@/core/queue/queue.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ChatSession, ChatMessage]),
    forwardRef(() => WalletModule),
    NotificationModule,
    forwardRef(() => CouponModule),
    forwardRef(() => ExpertProfileModule),
    QueueModule,
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
    GetChatEarningsUseCase,
    GetExpertSessionsByDateUseCase,
    CheckChatEligibilityUseCase,
    ResolveSessionDetailsUseCase,
  ],
  controllers: [ChatController, ConsultationController],
  exports: [
    ChatFacade,
    FindAllSessionsUseCase,
    AdminTerminateSessionUseCase,
    GetChatSessionStatsUseCase,
    RejectChatUseCase,
    GetChatEarningsUseCase,
  ],
})
export class ChatModule {}
