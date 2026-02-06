import { Injectable, OnModuleInit, Inject } from '@nestjs/common';
import { Role } from '@/modules/role/domain/entities/roles.entity';
import { IRoleRepository } from '../../domain/repositories/role.repository.interface';

@Injectable()
export class RolesService implements OnModuleInit {
  constructor(
    @Inject(IRoleRepository)
    private roleRepo: IRoleRepository,
  ) { }

  async onModuleInit() {
    await this.seedRoles();
  }

  async seedRoles() {
    const roles = ['client', 'expert', 'admin'];
    for (const roleName of roles) {
      const exists = await this.roleRepo.findByName(roleName);
      if (!exists) {
        await this.roleRepo.save(this.roleRepo.create({ name: roleName }));
        console.log(`Seeded role: ${roleName}`);
      }
    }
  }

  async findByName(name: string): Promise<Role | null> {
    return this.roleRepo.findByName(name);
  }

  async findByNames(names: string[]): Promise<Role[]> {
    return this.roleRepo.findByNames(names);
  }

  async create(name: string, description?: string): Promise<Role> {
    const role = this.roleRepo.create({ name, description });
    return this.roleRepo.save(role);
  }
}
