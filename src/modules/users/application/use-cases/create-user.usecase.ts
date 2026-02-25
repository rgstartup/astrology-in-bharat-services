import { Injectable } from '@nestjs/common';
import { CreateUserDto } from '../../presentation/dto/user.dto';
import { User } from '../../infrastructure/persistence/entities/user.entity';
import { RolesService } from '@/modules/role/roles.service'; // We might need to decouple this later, but for now duplicate logic
import { QueryRunner } from 'typeorm';
import { UserRepository } from '../../infrastructure/persistence/repositories/user.repository';

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

    if (dto.roles?.length) {
      const roleNames = dto.roles.map((r) => r.name);
      // rolesService might also need queryRunner if it does DB ops? 
      // But rolesService is injected. Ideally we should pass it there too if supported. 
      // usersService.create called this.rolesService.findByNames(roleNames). 
      // RolesService usually is finding read-only data for assignment.
      const roles = await this.rolesService.findByNames(roleNames, queryRunner);
      user.roles = roles;
    }

    return this.userRepository.create(user, queryRunner);
  }
}
