import { Injectable } from '@nestjs/common';
import { BooleanMessage } from '@/common/dto/boolean-message.dto';
import { User } from '../../infrastructure/entities/user.entity';
import { QueryRunner } from 'typeorm';
import { UserRepository } from '../../infrastructure/repositories/user.repository';

@Injectable()
export class UpdateUserUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(
    id: string,
    data: Partial<User>,
    queryRunner?: QueryRunner,
  ): Promise<BooleanMessage> {
    await this.userRepository.update(id, data, queryRunner);
    return new BooleanMessage();
  }
}
