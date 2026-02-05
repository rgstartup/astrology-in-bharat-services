import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatSession } from './domain/entities/chat-session.entity';
import { ChatMessage } from './domain/entities/chat-message.entity';
import { ChatService } from './application/services/chat.service';
import { ChatController } from './interfaces/controllers/chat.controller';
import { ChatGateway } from './interfaces/gateways/chat.gateway';
import { WalletModule } from '@/modules/wallet/wallet.module';
import { ProfileExpert } from '@/modules/expert';
import { IChatSessionRepository } from './domain/repositories/chat-session.repository.interface';
import { TypeOrmChatSessionRepository } from './infrastructure/persistence/typeorm-chat-session.repository';
import { IChatMessageRepository } from './domain/repositories/chat-message.repository.interface';
import { TypeOrmChatMessageRepository } from './infrastructure/persistence/typeorm-chat-message.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([ChatSession, ChatMessage, ProfileExpert]),
    WalletModule,
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
  exports: [ChatService],
})
export class ChatModule { }
