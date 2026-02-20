import { Module } from '@nestjs/common';
import { ChatModule } from '@/modules/chat/chat.module';
import { ExpertModule } from '@/modules/expert/expert.module';
import { UsersModule } from '@/modules/users/users.module';
import { WalletModule } from '@/modules/wallet/wallet.module';
import { OrderModule } from '@/modules/order/order.module';
import { AgentModule } from '@/modules/agent/agent.module';
import { AdminService } from './application/services/admin.service';
import { AdminController } from './interfaces/controllers/admin.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgentListing } from '@/modules/agent/domain/entities/agent-listing.entity';
import { AdminJwtStrategy } from './infrastructure/strategies/admin-jwt.strategy';

@Module({
  imports: [
    UsersModule,
    WalletModule,
    ExpertModule,
    ChatModule,
    OrderModule,
    AgentModule,
    TypeOrmModule.forFeature([AgentListing]),
  ],

  controllers: [AdminController],
  providers: [AdminService, AdminJwtStrategy],
  exports: [AdminService],
})
export class AdminModule { }
