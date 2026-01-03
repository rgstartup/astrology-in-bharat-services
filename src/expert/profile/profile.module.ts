import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { User } from '@/users/entities/user.entity';

import { ProfileExpert } from './entities/profile-expert.entity';
import { ProfileService } from './profile.service';
import { ProfileController } from './profile.controller';
import { Address } from '@/common/entities/address.entity';
import { ExpertGateway } from './expert.gateway';

@Module({
  imports: [TypeOrmModule.forFeature([ProfileExpert, User, Address])],
  providers: [ProfileService, ExpertGateway],
  controllers: [ProfileController],
})
export class ProfileModule { }
