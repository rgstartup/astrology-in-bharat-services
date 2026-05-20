import { Injectable } from '@nestjs/common';
import { CreateUserDto } from '../../api/dto/user.dto';
import { User } from '../../infrastructure/entities/user.entity';
import { QueryRunner } from 'typeorm';
import { UserRepository } from '../../infrastructure/repositories/user.repository';
import * as crypto from 'crypto';

import { RoleEnum } from '../../infrastructure/enums/Role.enum';

@Injectable()
export class CreateUserUseCase {
  constructor(
    private readonly userRepository: UserRepository,
  ) { }

  async execute(dto: CreateUserDto, queryRunner?: QueryRunner): Promise<User> {
    const user = new User();
    user.email = dto.email;
    user.password = dto.password ?? null;
    user.name = dto.name ?? null;
    user.avatar = dto.avatar ?? null;
    user.referred_by_id = dto.referred_by_id ?? null;

    if (dto.roles?.length) {
      user.roles = dto.roles;
    }

    // Generate branded unique ID
    const suffix = crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 6);
    const isExpert = dto.roles?.includes(RoleEnum.EXPERT);
    user.uid = isExpert ? `AIB-EXP-${suffix}` : `AIB-USR-${suffix}`;

    return this.userRepository.create(user, queryRunner);
  }
}
