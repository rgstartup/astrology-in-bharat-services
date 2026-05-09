import { Injectable } from '@nestjs/common';
import { CreateUserDto } from '../../presentation/dto/user.dto';
import { User } from '../../infrastructure/entities/user.entity';
import { RolesService } from '@/modules/role/roles.service';
import { QueryRunner } from 'typeorm';
import { UserRepository } from '../../infrastructure/repositories/user.repository';
import * as crypto from 'crypto';

@Injectable()
export class CreateUserUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly rolesService: RolesService,
  ) { }

  async execute(dto: CreateUserDto, queryRunner?: QueryRunner): Promise<User> {
    const user = new User();
    user.email = dto.email;
    user.password = dto.password;
    user.name = dto.name;
    user.avatar = dto.avatar;
    user.referred_by_id = dto.referred_by_id ?? null;

    if (dto.roles?.length) {
      const roleNames = dto.roles.map((r) => r.name);
      const roles = await this.rolesService.findByNames(roleNames, queryRunner);
      user.roles = roles;
    }

    // Generate branded unique ID
    const suffix = crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 6);
    const isExpert = dto.roles?.some((r) => r.name?.toLowerCase() === 'expert');
    user.uid = isExpert ? `AIB-EXP-${suffix}` : `AIB-USR-${suffix}`;

    return this.userRepository.create(user, queryRunner);
  }
}
