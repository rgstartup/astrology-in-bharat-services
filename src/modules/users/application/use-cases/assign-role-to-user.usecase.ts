import { Injectable, NotFoundException } from '@nestjs/common';
import { User } from '../../infrastructure/entities/user.entity';
import { QueryRunner } from 'typeorm';
import { UserRepository } from '../../infrastructure/repositories/user.repository';
import { RoleEnum } from '../../infrastructure/enums/Role.enum';

@Injectable()
export class AssignRoleToUserUseCase {
  constructor(
    private readonly userRepository: UserRepository,
  ) {}

  async execute(userId: string, roleName: RoleEnum, queryRunner?: QueryRunner): Promise<User> {
    const user = await this.userRepository.findById(userId, true, queryRunner);
    if (!user) throw new NotFoundException('User not found');

    if (!user.roles.includes(roleName)) {
      user.roles = [...(user.roles || []), roleName];
    }
    
    return this.userRepository.create(user, queryRunner); 
  }
}
