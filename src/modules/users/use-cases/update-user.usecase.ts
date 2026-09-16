import { Injectable } from '@nestjs/common';
import { BooleanMessage } from '@/common/dto/boolean-message.dto';
import { User } from '../entities/user.entity';
import { QueryRunner } from 'typeorm';
import { UserRepository } from '../repositories/user.repository';

@Injectable()
export class UpdateUserUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(
    id: number,
    data: Partial<User>,
    queryRunner?: QueryRunner,
  ): Promise<BooleanMessage> {
    await this.userRepository.update(id, data, queryRunner);
    return new BooleanMessage();
  }
}
