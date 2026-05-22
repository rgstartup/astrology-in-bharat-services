import { Injectable, NotFoundException } from '@nestjs/common';
import { User } from '../../infrastructure/entities/user.entity';
import { QueryRunner } from 'typeorm';
import { UserRepository } from '../../infrastructure/repositories/user.repository';

@Injectable()
export class UpdateUserUseCase {
  constructor(
    private readonly userRepository: UserRepository,
  ) { }

  async execute(id: string, data: Partial<User>, queryRunner?: QueryRunner): Promise<User> {
    const user = await this.userRepository.findById(id, true, queryRunner);
    if (!user) throw new NotFoundException('User not found');
    return this.userRepository.update(id as any, data, queryRunner);
  }
}
