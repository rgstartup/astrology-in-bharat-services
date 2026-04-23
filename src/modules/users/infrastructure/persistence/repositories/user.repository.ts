import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { BaseService } from '@/common/services/transaction.service';
import { User } from '../entities/user.entity';

@Injectable()
export class UserRepository extends BaseService<User> {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {
    super(usersRepo);
  }

  async create(data: Partial<User>, queryRunner?: QueryRunner): Promise<User> {
    const repo = this.getRepo(queryRunner);
    const user = repo.create(data);
    return repo.save(user);
  }

  async findAll(queryRunner?: QueryRunner): Promise<User[]> {
    return this.getRepo(queryRunner).find();
  }

  async findByEmail(email: string, queryRunner?: QueryRunner): Promise<User | null> {
    return this.getRepo(queryRunner).findOne({ where: { email } });
  }

  async findByEmailWithPassword(email: string, queryRunner?: QueryRunner): Promise<User | null> {
    return this.getRepo(queryRunner).findOne({ where: { email } });
  }

  async findById(id: number, queryRunner?: QueryRunner): Promise<User | null> {
    return this.getRepo(queryRunner).findOne({ where: { id } });
  }

  async findByBetterAuthId(betterAuthUserId: string, queryRunner?: QueryRunner): Promise<User | null> {
    return this.getRepo(queryRunner).findOne({ where: { better_auth_user_id: betterAuthUserId } });
  }

  async update(id: number, data: Partial<User>, queryRunner?: QueryRunner): Promise<User> {
    const repo = this.getRepo(queryRunner);
    await repo.update(id, data);
    return repo.findOne({ where: { id } }) as Promise<User>;
  }

  async delete(id: number, queryRunner?: QueryRunner): Promise<void> {
    await this.getRepo(queryRunner).delete(id);
  }
}
