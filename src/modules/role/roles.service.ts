import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository, QueryRunner, Raw } from 'typeorm';
import { Role } from './entities/roles.entity';
import { BaseService } from '@/common/services/transaction.service';

@Injectable()
export class RolesService extends BaseService<Role> {
  constructor(
    @InjectRepository(Role)
    private roleRepo: Repository<Role>,
  ) {
    super(roleRepo);
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
