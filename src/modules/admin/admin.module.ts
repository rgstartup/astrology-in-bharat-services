import { Module } from '@nestjs/common';
import { ChatModule } from '@/modules/chat/chat.module';
import { ExpertModule } from '@/modules/expert/expert.module';
import { UsersModule } from '@/modules/users/users.module';
import { WalletModule } from '@/modules/wallet/wallet.module';
import { OrderModule } from '@/modules/order/order.module';
import { AdminService } from './application/services/admin.service';
import { AdminController } from './interfaces/controllers/admin.controller';

@Module({
  imports: [
    UsersModule,
    WalletModule,
    ExpertModule,
    ChatModule,
    OrderModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule { }
