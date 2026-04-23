import { Injectable } from '@nestjs/common';
import { CreateUserDto } from '../../presentation/dto/user.dto';
import { User } from '../../infrastructure/persistence/entities/user.entity';
import { QueryRunner } from 'typeorm';
import { UserRepository } from '../../infrastructure/persistence/repositories/user.repository';
import * as crypto from 'crypto';

@Injectable()
export class CreateUserUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(dto: CreateUserDto, queryRunner?: QueryRunner): Promise<User> {
    const role = dto.role ?? 'client';
    const suffix = crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 6);
    const uid = role === 'expert' ? `AIB-EXP-${suffix}` : `AIB-USR-${suffix}`;

    const user = new User();
    user.better_auth_user_id = dto.better_auth_user_id;
    user.email = dto.email;
    user.name = dto.name;
    user.avatar = dto.avatar;
    user.role = role;
    user.uid = uid;
    user.referred_by_id = dto.referred_by_id ?? null;

    return this.userRepository.create(user, queryRunner);
  }
}
