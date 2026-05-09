import { Injectable, NotFoundException } from '@nestjs/common';
import { QueryRunner } from 'typeorm';
import { User } from '../../infrastructure/entities/user.entity';
import { UserRepository } from '../../infrastructure/repositories/user.repository';

@Injectable()
export class FindUserUseCase {
  constructor(
    private readonly userRepository: UserRepository,
  ) {}

  async findById(id: number, queryRunner?: QueryRunner): Promise<User> {
    const user = await this.userRepository.findById(id, true, queryRunner);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findByEmail(email: string, queryRunner?: QueryRunner): Promise<User | null> {
    return this.userRepository.findByEmail(email, queryRunner);
  }

  async findByEmailWithPassword(email: string, queryRunner?: QueryRunner): Promise<User | null> {
    return this.userRepository.findByEmailWithPassword(email, queryRunner);
  }

  async findAll(queryRunner?: QueryRunner): Promise<User[]> {
      return this.userRepository.findAll(queryRunner);
  }
}
