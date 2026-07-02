import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './api/controllers/users.controller';
import { User } from './infrastructure/entities/user.entity';
import { UserRepository } from './infrastructure/repositories/user.repository';
import { CreateUserUseCase } from './application/use-cases/create-user.usecase';
import { FindUserUseCase } from './application/use-cases/find-user.usecase';
import { UpdateUserUseCase } from './application/use-cases/update-user.usecase';

import { DeleteUserUseCase } from './application/use-cases/delete-user.usecase';
import { AssignRoleToUserUseCase } from './application/use-cases/assign-role-to-user.usecase';
import { GetExpertStatsUseCase } from './application/use-cases/get-expert-stats.usecase';
import { GetClientStatsUseCase } from './application/use-cases/get-client-stats.usecase';
import { GetUserExpertGrowthStatsUseCase } from './application/use-cases/get-user-expert-growth-stats.usecase';
import { FindUsersByRoleUseCase } from './application/use-cases/find-users-by-role.usecase';
import { FindReferredUsersUseCase } from './application/use-cases/find-referred-users.usecase';
import { GetFilteredUsersUseCase } from './application/use-cases/get-filtered-users.use-case';
import { UsersFacade } from './application/users.facade';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UsersController],
  providers: [
    UsersFacade,
    CreateUserUseCase,
    FindUserUseCase,
    UpdateUserUseCase,
    DeleteUserUseCase,
    AssignRoleToUserUseCase,
    GetExpertStatsUseCase,
    GetClientStatsUseCase,
    GetUserExpertGrowthStatsUseCase,
    FindUsersByRoleUseCase,
    FindReferredUsersUseCase,
    GetFilteredUsersUseCase,
    UserRepository,
  ],
  exports: [UsersFacade, UserRepository, FindUserUseCase, TypeOrmModule],
})
export class UsersModule {}
