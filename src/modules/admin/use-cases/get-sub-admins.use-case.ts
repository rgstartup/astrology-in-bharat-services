// src/modules/admin/application/use-cases/get-sub-admins.use-case.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '@/modules/users/infrastructure/entities/user.entity';
import { RoleEnum } from '@/modules/users/infrastructure/enums/Role.enum';

@Injectable()
export class GetSubAdminsUseCase {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async execute(): Promise<Partial<User>[]> {
    const subAdmins = await this.userRepo
      .createQueryBuilder('user')
      .select([
        'user.id',
        'user.name',
        'user.email',
        'user.roles',
        'user.admin_permissions',
        'user.is_blocked',
        'user.created_at',
      ])
      .where(':role = ANY(user.roles)', { role: RoleEnum.SUB_ADMIN })
      .orderBy('user.created_at', 'DESC')
      .getMany();

    return subAdmins;
  }
}
