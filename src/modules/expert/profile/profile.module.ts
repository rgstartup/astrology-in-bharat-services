import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { User } from '@/modules/users/entities/user.entity';

import { ProfileExpert } from './entities/profile-expert.entity';
import { ProfileService } from './profile.service';
import { ProfileController } from './profile.controller';
import { Address } from '@/common/entities/address.entity';
import { ExpertGateway } from './expert.gateway';
import { CloudinaryModule } from '@/common/cloudinary/cloudinary.module';

@Module({
  imports: [TypeOrmModule.forFeature([ProfileExpert, User, Address]), CloudinaryModule],
  providers: [ProfileService, ExpertGateway],
  controllers: [ProfileController],
})
export class ProfileModule { }
