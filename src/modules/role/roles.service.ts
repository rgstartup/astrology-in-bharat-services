import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Role } from './entities/roles.entity';

@Injectable()
export class RolesService implements OnModuleInit {
  constructor(
    @InjectRepository(Role)
    private roleRepo: Repository<Role>,
  ) { }

  async onModuleInit() {
    await this.seedRoles();
  }

  async seedRoles() {
    const roles = ['client', 'expert', 'admin'];
    for (const roleName of roles) {
      const exists = await this.roleRepo.findOne({ where: { name: roleName } });
      if (!exists) {
        await this.roleRepo.save(this.roleRepo.create({ name: roleName }));
        console.log(`Seeded role: ${roleName}`);
      }
    }
  }

  async findByName(name: string): Promise<Role | null> {
    return this.roleRepo.findOne({ where: { name } });
  }

  async findByNames(names: string[]): Promise<Role[]> {
    return this.roleRepo.findBy({ name: names.length ? In(names) : In([]) });
  }

  async create(name: string, description?: string): Promise<Role> {
    const role = this.roleRepo.create({ name, description });
    return this.roleRepo.save(role);
  }
}
