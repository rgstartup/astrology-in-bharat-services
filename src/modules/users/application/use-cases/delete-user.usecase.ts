import { Injectable } from '@nestjs/common';
import { QueryRunner } from 'typeorm';
import { UserRepository } from '../../infrastructure/repositories/user.repository';

@Injectable()
export class DeleteUserUseCase {
  constructor(
    private readonly userRepository: UserRepository,
  ) {}

  async execute(id: string, queryRunner?: QueryRunner): Promise<void> {
    await this.userRepository.delete(id, queryRunner);
  }
}
