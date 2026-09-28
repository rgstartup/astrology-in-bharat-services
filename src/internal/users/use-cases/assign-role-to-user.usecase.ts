import { Injectable, NotFoundException } from '@nestjs/common';
import { User } from '../entities/user.entity';
import { QueryRunner } from 'typeorm';
import { UserRepository } from '../repositories/user.repository';
import { RoleEnum } from '../enums/Role.enum';

@Injectable()
export class AssignRoleToUserUseCase {
  constructor(private readonly userRepository: UserRepository) { }

  async execute(
    userId: number,
    roleName: RoleEnum,
    queryRunner?: QueryRunner,
  ): Promise<User> {
    const user = await this.userRepository.findById(userId, true, queryRunner);
    if (!user) throw new NotFoundException('User not found');

    user.role = roleName;

    return this.userRepository.create(user, queryRunner);
  }
}
