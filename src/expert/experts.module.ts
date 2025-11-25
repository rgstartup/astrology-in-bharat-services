import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExpertsController } from './experts.controller';
import { ExpertsService } from './experts.service';
import { ProfileExpert } from './profile/entities/profile-expert.entity';
import { User } from '@/users/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ProfileExpert, User])],
  controllers: [ExpertsController],
  providers: [ExpertsService],
})
export class ExpertsModule {}
