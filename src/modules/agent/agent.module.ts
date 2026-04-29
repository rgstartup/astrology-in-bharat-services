import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgentProfile } from './infrastructure/persistence/entities/agent-profile.entity';
import { AgentListing } from './infrastructure/persistence/entities/agent-listing.entity';
import { AgentController } from './api/controllers/agent.controller';
import { DatabaseModule } from '@/core/database/database.module';
import { WalletModule } from '../wallet/wallet.module';
import { CallSession } from '../call/infrastructure/persistence/entities/call-session.entity';
import { ChatSession } from '../chat/infrastructure/persistence/entities/chat-session.entity';
import { PujaAppointment } from '../puja-appointment/infrastructure/persistence/entities/puja-appointment.entity';
import { Order } from '../order/infrastructure/persistence/entities/order.entity';
import { NotificationModule } from '../notification/notification.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([AgentProfile, AgentListing, CallSession, ChatSession, PujaAppointment, Order]),
        DatabaseModule,
        WalletModule,
        NotificationModule,
    ],
    controllers: [AgentController],
    providers: [],
})
export class AgentModule { }
