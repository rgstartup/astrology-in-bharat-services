import { Injectable } from '@nestjs/common';
import { CreateUserUseCase } from './use-cases/create-user.usecase';
import { FindUserUseCase } from './use-cases/find-user.usecase';
import { UpdateUserUseCase } from './use-cases/update-user.usecase';
import { DeleteUserUseCase } from './use-cases/delete-user.usecase';
import { AssignRoleToUserUseCase } from './use-cases/assign-role-to-user.usecase';
import { GetExpertStatsUseCase } from './use-cases/get-expert-stats.usecase';
import { GetClientStatsUseCase } from './use-cases/get-client-stats.usecase';
import { GetUserExpertGrowthStatsUseCase } from './use-cases/get-user-expert-growth-stats.usecase';
import { FindUsersByRoleUseCase } from './use-cases/find-users-by-role.usecase';
import { CreateUserDto } from '../api/dto/user.dto';
import { User } from '../infrastructure/entities/user.entity';

import { QueryRunner } from 'typeorm';
import { RoleEnum } from '../infrastructure/enums/Role.enum';

@Injectable()
export class UsersFacade {
  constructor(
    private readonly createUserUseCase: CreateUserUseCase,
    private readonly findUserUseCase: FindUserUseCase,
    private readonly updateUserUseCase: UpdateUserUseCase,
    private readonly deleteUserUseCase: DeleteUserUseCase,
    private readonly assignRoleToUserUseCase: AssignRoleToUserUseCase,
    private readonly getExpertStatsUseCase: GetExpertStatsUseCase,
    private readonly getClientStatsUseCase: GetClientStatsUseCase,
    private readonly getUserExpertGrowthStatsUseCase: GetUserExpertGrowthStatsUseCase,
    private readonly findUsersByRoleUseCase: FindUsersByRoleUseCase,
  ) { }

  create(dto: CreateUserDto, queryRunner?: QueryRunner) {
    return this.createUserUseCase.execute(dto, queryRunner);
  }

  findAll(queryRunner?: QueryRunner) {
    return this.findUserUseCase.findAll(queryRunner);
  }

  findByEmail(email: string, queryRunner?: QueryRunner) {
    return this.findUserUseCase.findByEmail(email, queryRunner);
  }

  findByEmailWithPassword(email: string, queryRunner?: QueryRunner) {
    return this.findUserUseCase.findByEmailWithPassword(email, queryRunner);
  }

  findById(id: number, queryRunner?: QueryRunner) {
    return this.findUserUseCase.findById(id, queryRunner);
  }

  update(id: number, dto: Partial<User>, queryRunner?: QueryRunner) {
    return this.updateUserUseCase.execute(id, dto, queryRunner);
  }

  delete(id: number, queryRunner?: QueryRunner) {
    return this.deleteUserUseCase.execute(id, queryRunner);
  }

  assignRole(userId: number, roleName: RoleEnum, queryRunner?: QueryRunner) {
    return this.assignRoleToUserUseCase.execute(userId, roleName, queryRunner);
  }

  getExpertStats() {
    return this.getExpertStatsUseCase.execute();
  }

  getClientStats() {
    return this.getClientStatsUseCase.execute();
  }

  getUserExpertGrowthStats(days: number = 7) {
    return this.getUserExpertGrowthStatsUseCase.execute(days);
  }

  findAllByRole(role: string, search?: string, page: number = 1, limit: number = 10, status?: string) {
    return this.findUsersByRoleUseCase.execute(role, search, page, limit, status);
  }

  getExpertsForRevenue(queryRunner?: QueryRunner) {
    return this.findUserUseCase.getExpertsForRevenue(queryRunner);
  }
}
