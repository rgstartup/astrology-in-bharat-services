import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { BaseService } from '@/common/services/transaction.service';
import { User } from '../entities/user.entity';
import { RoleEnum } from '../enums/Role.enum';

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
    return this.getRepo(queryRunner).find({
      relations: ['oauth_accounts'],
    });
  }

  async findByEmail(email: string, queryRunner?: QueryRunner): Promise<User | null> {
    return this.getRepo(queryRunner).findOne({
      where: { email },
      relations: ['profile_client', 'profile_expert'],
    });
  }

  async findByEmailWithPassword(email: string, queryRunner?: QueryRunner): Promise<User | null> {
    return this.getRepo(queryRunner)
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email })
      .getOne();
  }

  async findById(id: number, all: boolean = true, queryRunner?: QueryRunner): Promise<User | null> {
    return this.getRepo(queryRunner).findOne({
      where: { id },
      relations: {
        oauth_accounts: all,
        sessions: all,
        profile_client: true,
        profile_expert: true,
      },
    });
  }

  async update(id: number, data: Partial<User>, queryRunner?: QueryRunner): Promise<User> {
    
    const repo = this.getRepo(queryRunner);

    // Remove relations from data if they present to avoid TypeORM issues with update
    // For roles, we should use specific methods or save.
    // But for now, let's try to save if we have complex data, or update if simple.
    // However, the interface says `update`.
    // To keep it simple and consistent with Service:
    await repo.update(id, data);

    // Re-fetch to return the updated entity, 
    // ensuring we use the same transaction if present
    const updatedUser = await repo.findOne({ where: { id } });
    
    if (!updatedUser) {
      throw new Error(`User with id ${id} not found after update`);
    }

    return updatedUser;  
  }

  async delete(id: number, queryRunner?: QueryRunner): Promise<void> {
    const repo = this.getRepo(queryRunner);
    await repo.delete(id);
  }

  async getExpertsForRevenue(queryRunner?: QueryRunner): Promise<User[]> {
    
    return this.getRepo(queryRunner)
      .createQueryBuilder('user')
      .innerJoin('user.profile_expert', 'profile')
      .where(':role = Any(user.roles)', { role: RoleEnum.EXPERT })
      .select(['user.id', 'user.name', 'profile.id'])
      .getMany();
  }
  
}
