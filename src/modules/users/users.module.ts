import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './controllers/users.controller';
import { User } from './entities/user.entity';
import { UserRepository } from './repositories/user.repository';
import { CreateUserUseCase } from './use-cases/create-user.usecase';
import { FindUserUseCase } from './use-cases/find-user.usecase';
import { UpdateUserUseCase } from './use-cases/update-user.usecase';

import { DeleteUserUseCase } from './use-cases/delete-user.usecase';
import { AssignRoleToUserUseCase } from './use-cases/assign-role-to-user.usecase';
import { GetExpertStatsUseCase } from './use-cases/get-expert-stats.usecase';
import { GetClientStatsUseCase } from './use-cases/get-client-stats.usecase';
import { GetUserExpertGrowthStatsUseCase } from './use-cases/get-user-expert-growth-stats.usecase';
import { FindUsersByRoleUseCase } from './use-cases/find-users-by-role.usecase';
import { FindReferredUsersUseCase } from './use-cases/find-referred-users.usecase';
import { GetFilteredUsersUseCase } from './use-cases/get-filtered-users.use-case';
import { UsersFacade } from './users.facade';

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
