import { Injectable, NotFoundException } from '@nestjs/common';
import { RolesService } from '@/modules/role/roles.service';
import { User } from '../../infrastructure/entities/user.entity';
import { QueryRunner } from 'typeorm';
import { UserRepository } from '../../infrastructure/repositories/user.repository';

@Injectable()
export class AssignRoleToUserUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly rolesService: RolesService,
  ) {}

  async execute(userId: number, roleName: string, queryRunner?: QueryRunner): Promise<User> {
    const user = await this.userRepository.findById(userId, true, queryRunner);
    if (!user) throw new NotFoundException('User not found');

    const role = await this.rolesService.findByName(roleName, queryRunner);
    if (!role) throw new NotFoundException(`Role ${roleName} not found`);

    user.roles = [...(user.roles || []), role];
    
    // We need to save the user with the new role
    // The repository update method takes Partial<User>, but for relationships we might need save.
    // However, let's use the update method we defined which calls save/update.
    // Actually, save is better for relations.
    // Let's assume Repository.update handles it or we need a save method in Repository.
    // Our RepositoryImpl.create uses save. RepositoryImpl.update uses update.
    // TypeORM update doesn't handle relations well. We should probably use save.
    // Let's check RepositoryImpl.update implementation.
    // It called repo.update(id, data). This won't update relations if we pass user object with roles.
    // We should probably add a save method to repository or stick to the specific logic.
    // For now, let's assume we can call create (which calls save) with the user entity to update it since it has an ID.
    
    return this.userRepository.create(user, queryRunner); 
  }
}
