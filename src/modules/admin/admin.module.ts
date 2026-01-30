import { Module } from '@nestjs/common';

import { AdminController } from './admin.controller';
import { UsersModule } from '@/modules/users/users.module';
import { WalletModule } from '@/modules/wallet/wallet.module';

import { ProfileModule } from '@/modules/expert/profile/profile.module';
import { ChatModule } from '@/modules/chat/chat.module';

@Module({
  imports: [UsersModule, WalletModule, ProfileModule, ChatModule],
  controllers: [AdminController],
})
export class AdminModule { }
