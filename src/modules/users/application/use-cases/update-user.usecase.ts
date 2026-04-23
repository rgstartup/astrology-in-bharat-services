import { Injectable, NotFoundException } from '@nestjs/common';
import { User } from '../../infrastructure/persistence/entities/user.entity';
import { QueryRunner } from 'typeorm';
import { UserRepository } from '../../infrastructure/persistence/repositories/user.repository';

@Injectable()
export class UpdateUserUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(id: number, data: Partial<User>, queryRunner?: QueryRunner): Promise<User> {
    const user = await this.userRepository.findById(id, queryRunner);
    if (!user) throw new NotFoundException('User not found');
    return this.userRepository.update(id, data, queryRunner);
  }
}
