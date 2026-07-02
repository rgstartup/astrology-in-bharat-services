import { Injectable } from '@nestjs/common';
import { CreateUserDto } from '../../api/dto/user.dto';
import { User } from '../../infrastructure/entities/user.entity';
import { QueryRunner } from 'typeorm';
import { UserRepository } from '../../infrastructure/repositories/user.repository';
// import * as crypto from 'crypto'; // unused

@Injectable()
export class CreateUserUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(dto: CreateUserDto, queryRunner?: QueryRunner): Promise<User> {
    const user = new User();
    // let uid: string = "";
    user.email = dto.email;
    user.password = dto.password ?? null;
    user.name = dto.name ?? null;
    user.avatar = dto.avatar ?? null;
    user.referred_by_id = dto.referred_by_id ?? null;

    if (dto.roles?.length) {
      user.roles = dto.roles;
    }

    // Generate branded unique ID
    // uid is removed

    return this.userRepository.create(user, queryRunner);
  }
}
