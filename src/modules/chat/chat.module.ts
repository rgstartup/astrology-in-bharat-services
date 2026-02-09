import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProfileExpert } from '@/modules/expert/domain/entities/profile-expert.entity';
import { WalletModule } from '@/modules/wallet/wallet.module';
import { NotificationModule } from '@/modules/notification/notification.module';
import { ChatService } from './application/services/chat.service';
import { ChatMessage } from './domain/entities/chat-message.entity';
import { ChatSession } from './domain/entities/chat-session.entity';
import { IChatMessageRepository } from './domain/repositories/chat-message.repository.interface';
import { IChatSessionRepository } from './domain/repositories/chat-session.repository.interface';
import { TypeOrmChatMessageRepository } from './infrastructure/persistence/typeorm-chat-message.repository';
import { TypeOrmChatSessionRepository } from './infrastructure/persistence/typeorm-chat-session.repository';
import { ChatController } from './interfaces/controllers/chat.controller';
import { ChatGateway } from './interfaces/gateways/chat.gateway';

@Module({
  imports: [
    TypeOrmModule.forFeature([ChatSession, ChatMessage, ProfileExpert]),
    WalletModule,
    NotificationModule,
  ],
  providers: [
    ChatService,
    ChatGateway,
    {
      provide: IChatSessionRepository,
      useClass: TypeOrmChatSessionRepository,
    },
    {
      provide: IChatMessageRepository,
      useClass: TypeOrmChatMessageRepository,
    },
  ],
  controllers: [ChatController],
  exports: [ChatService, IChatSessionRepository, IChatMessageRepository],
})
export class ChatModule { }
