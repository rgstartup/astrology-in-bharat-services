import { Injectable } from '@nestjs/common';
import { BooleanMessage } from '@/common/dto/boolean-message.dto';
import { QueryRunner } from 'typeorm';
import { UserRepository } from '../../infrastructure/repositories/user.repository';

@Injectable()
export class DeleteUserUseCase {
  constructor(
    private readonly userRepository: UserRepository,
  ) {}

  async execute(id: string, queryRunner?: QueryRunner): Promise<BooleanMessage> {
    await this.userRepository.delete(id, queryRunner);
    return new BooleanMessage();
  }
}
