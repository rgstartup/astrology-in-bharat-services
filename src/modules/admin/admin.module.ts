import { Module } from '@nestjs/common';
import { AdminController } from './interfaces/controllers/admin.controller';
import { AdminService } from './application/services/admin.service';
import { UsersModule } from '@/modules/users/users.module';
import { WalletModule } from '@/modules/wallet/wallet.module';
import { ExpertModule } from '@/modules/expert/expert.module';
import { ChatModule } from '@/modules/chat/chat.module';

@Module({
  imports: [
    UsersModule,
    WalletModule,
    ExpertModule,
    ChatModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule { }
