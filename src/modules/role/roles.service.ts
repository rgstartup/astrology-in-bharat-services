import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository, QueryRunner, Raw } from 'typeorm';
import { Role } from './entities/roles.entity';
import { BaseService } from '@/common/services/transaction.service';

@Injectable()
export class RolesService extends BaseService<Role> implements OnModuleInit {
  private readonly logger = new Logger(RolesService.name);

  constructor(
    @InjectRepository(Role)
    private roleRepo: Repository<Role>,
  ) {
    super(roleRepo);
  }

  async onModuleInit() {
    await this.seedRoles();
  }

  private async seedRoles() {
    const defaultRoles = ['admin', 'expert', 'client', 'merchant', 'agent'];
    this.logger.log('Starting role seeding check...');

    try {
      for (const roleName of defaultRoles) {
        const existingRole = await this.findByName(roleName);
        this.logger.debug(`Checking role "${roleName}": ${existingRole ? 'Found' : 'Not Found'}`);
        
        if (!existingRole) {
          this.logger.log(`Role "${roleName}" not found. Creating...`);
          const newRole = await this.create(roleName, `Default ${roleName} role`);
          this.logger.log(`Role "${roleName}" created with ID: ${newRole.id}`);
        }
      }
      this.logger.log('Role seeding check completed.');
    } catch (error) {
      this.logger.error('Error during role seeding:', error.stack);
    }
  }

  async findByName(name: string, queryRunner?: QueryRunner): Promise<Role | null> {
    return this.getRepo(queryRunner).findOne({
      where: { name: Raw(alias => `LOWER(${alias}) = LOWER(:name)`, { name }) }
    });
  }

  async findByNames(names: string[], queryRunner?: QueryRunner): Promise<Role[]> {
    if (!names.length) return [];
    return this.getRepo(queryRunner).find({
      where: {
        name: Raw(alias => `LOWER(${alias}) IN (:...names)`, { names: names.map(n => n.toLowerCase()) })
      }
    });
  }

  async create(name: string, description?: string, queryRunner?: QueryRunner): Promise<Role> {
    const repo = this.getRepo(queryRunner);
    const role = repo.create({ name, description });
    return repo.save(role);
  }
}
