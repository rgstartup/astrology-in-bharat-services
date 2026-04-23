import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './presentation/controllers/users.controller';
import { User } from './infrastructure/persistence/entities/user.entity';
import { ProfileExpert } from '@/modules/expert/profile/infrastructure/persistence/entities/profile-expert.entity';
import { UserRepository } from './infrastructure/persistence/repositories/user.repository';
import { CreateUserUseCase } from './application/use-cases/create-user.usecase';
import { FindUserUseCase } from './application/use-cases/find-user.usecase';
import { UpdateUserUseCase } from './application/use-cases/update-user.usecase';
import { DeleteUserUseCase } from './application/use-cases/delete-user.usecase';
import { AssignRoleToUserUseCase } from './application/use-cases/assign-role-to-user.usecase';
import { GetExpertStatsUseCase } from './application/use-cases/get-expert-stats.usecase';
import { GetUserStatsUseCase } from './application/use-cases/get-user-stats.usecase';
import { GetUserExpertGrowthStatsUseCase } from './application/use-cases/get-user-expert-growth-stats.usecase';
import { FindUsersByRoleUseCase } from './application/use-cases/find-users-by-role.usecase';
import { UsersFacade } from './application/users.facade';

@Module({
  imports: [TypeOrmModule.forFeature([User, ProfileExpert])],
  controllers: [UsersController],
  providers: [
    UsersFacade,
    UserRepository,
    CreateUserUseCase,
    FindUserUseCase,
    UpdateUserUseCase,
    DeleteUserUseCase,
    AssignRoleToUserUseCase,
    GetExpertStatsUseCase,
    GetUserStatsUseCase,
    GetUserExpertGrowthStatsUseCase,
    FindUsersByRoleUseCase,
  ],
  exports: [UsersFacade, UserRepository, FindUserUseCase, TypeOrmModule],
})
export class UsersModule {}
