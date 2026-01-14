import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { User } from '@/modules/users/entities/user.entity';

import { ProfileClient } from './entities/profile-client.entity';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { Address } from '@/common/entities/address.entity';

import { CloudinaryModule } from '@/common/cloudinary/cloudinary.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProfileClient, User, Address]),
    CloudinaryModule,
  ],
  controllers: [ProfileController],
  providers: [ProfileService],
})
export class ProfileModule { }
