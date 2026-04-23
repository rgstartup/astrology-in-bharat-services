import { Injectable, NotFoundException } from '@nestjs/common';
import { QueryRunner } from 'typeorm';
import { UserRepository } from '../../infrastructure/persistence/repositories/user.repository';

@Injectable()
export class AssignRoleToUserUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(userId: number, roleName: string, queryRunner?: QueryRunner): Promise<void> {
    const user = await this.userRepository.findById(userId, queryRunner);
    if (!user) throw new NotFoundException('User not found');
    await this.userRepository.update(userId, { role: roleName }, queryRunner);
  }
}
