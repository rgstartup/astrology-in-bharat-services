// src/modules/admin/application/use-cases/update-sub-admin.use-case.ts
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '@/modules/users/infrastructure/entities/user.entity';
import { RoleEnum } from '@/modules/users/infrastructure/enums/Role.enum';
import { AdminPermission } from '@/modules/users/infrastructure/enums/AdminPermission.enum';
import { IHasherToken, IHasher } from '@/common/contracts/hasher.contract';
import { AdminAuditLog } from '../../infrastructure/entities/admin-audit-log.entity';

export interface UpdateSubAdminInput {
  targetId: string;
  permissions?: AdminPermission[];
  name?: string;
  password?: string;
  updatedByAdminId: string;
}

@Injectable()
export class UpdateSubAdminUseCase {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(AdminAuditLog)
    private readonly auditLogRepo: Repository<AdminAuditLog>,
    @Inject(IHasherToken)
    private readonly hasher: IHasher,
  ) {}

  async execute(input: UpdateSubAdminInput): Promise<Partial<User>> {
    const target = await this.userRepo.findOne({
      where: { id: input.targetId },
    });

    if (!target) {
      throw new NotFoundException('Sub-admin nahi mila');
    }

    // SUPER_ADMIN ko update nahi kar sakte — IDOR protection
    if (target.roles.includes(RoleEnum.SUPER_ADMIN) || target.roles.includes(RoleEnum.ADMIN)) {
      throw new ForbiddenException(
        'Super Admin ya Admin ko is tarah modify nahi kar sakte',
      );
    }

    // Sirf SUB_ADMIN ko update karo
    if (!target.roles.includes(RoleEnum.SUB_ADMIN)) {
      throw new ForbiddenException('Ye user ek sub-admin nahi hai');
    }

    const oldPermissions = target.admin_permissions;

    // Update karo jo fields aaye hain
    if (input.permissions !== undefined) {
      target.admin_permissions = input.permissions;
    }
    if (input.name !== undefined) {
      target.name = input.name;
    }
    if (input.password !== undefined) {
      target.password = await this.hasher.hash(input.password);
    }

    const saved = await this.userRepo.save(target);

    // Audit log
    await this.auditLogRepo.save(
      this.auditLogRepo.create({
        admin_id: input.updatedByAdminId,
        action: 'UPDATE_SUB_ADMIN',
        resource_type: 'SUB_ADMIN',
        resource_id: input.targetId,
        details: {
          old_permissions: oldPermissions,
          new_permissions: input.permissions,
          name_changed: input.name !== undefined,
          password_changed: input.password !== undefined,
        },
      }),
    );

    const { password: _pw, ...result } = saved as any;
    return result;
  }
}
