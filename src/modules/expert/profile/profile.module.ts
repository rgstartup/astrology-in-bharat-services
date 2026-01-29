import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { User } from '@/modules/users/entities/user.entity';

import { ProfileExpert } from './entities/profile-expert.entity';
import {
  ChatSession,
  ChatSessionStatus,
} from '@/modules/chat/entities/chat-session.entity';
import { ProfileService } from './profile.service';
import { ProfileController } from './profile.controller';
import { Address } from '@/common/entities/address.entity';
import { ExpertGateway } from './expert.gateway';
import { CloudinaryModule } from '@/common/cloudinary/cloudinary.module';
import { NotificationModule } from '@/notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProfileExpert, User, Address, ChatSession]),
    CloudinaryModule,
    NotificationModule,
  ],
  providers: [ProfileService, ExpertGateway],
  controllers: [ProfileController],
  exports: [ProfileService],
})
export class ProfileModule { }
