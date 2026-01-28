import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExpertEarningsService } from './earnings.service';
import { ExpertEarningsController } from './earnings.controller';
import { ExpertWalletController } from './expert-wallet.controller';
import { ChatSession } from '@/modules/chat/entities/chat-session.entity';
import { ProfileExpert } from '../profile/entities/profile-expert.entity';
import { WalletModule } from '@/modules/wallet/wallet.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([ChatSession, ProfileExpert]),
        WalletModule,
    ],
    controllers: [ExpertEarningsController, ExpertWalletController],
    providers: [ExpertEarningsService],
    exports: [ExpertEarningsService],
})
export class ExpertEarningsModule { }
