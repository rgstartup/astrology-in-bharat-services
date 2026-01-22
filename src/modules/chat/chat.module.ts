import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatSession } from './entities/chat-session.entity';
import { ChatMessage } from './entities/chat-message.entity';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { ChatGateway } from './chat.gateway';
import { WalletModule } from '@/modules/wallet/wallet.module';
import { ProfileExpert } from '@/modules/expert/profile/entities/profile-expert.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([ChatSession, ChatMessage, ProfileExpert]),
        WalletModule,
    ],
    providers: [ChatService, ChatGateway],
    controllers: [ChatController],
    exports: [ChatService],
})
export class ChatModule { }
