// src/modules/admin/application/use-cases/delete-sub-admin.use-case.ts
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '@/modules/users/infrastructure/entities/user.entity';
import { RoleEnum } from '@/modules/users/infrastructure/enums/Role.enum';
import { AdminAuditLog } from '../../infrastructure/entities/admin-audit-log.entity';

@Injectable()
export class DeleteSubAdminUseCase {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(AdminAuditLog)
    private readonly auditLogRepo: Repository<AdminAuditLog>,
  ) {}

  async execute(targetId: string, deletedByAdminId: string): Promise<{ success: boolean }> {
    const target = await this.userRepo.findOne({
      where: { id: targetId },
    });

    if (!target) {
      throw new NotFoundException('Sub-admin nahi mila');
    }

    // Super admin aur Admin ko delete karne se rokna — bahut important!
    if (
      target.roles.includes(RoleEnum.SUPER_ADMIN) ||
      target.roles.includes(RoleEnum.ADMIN)
    ) {
      throw new ForbiddenException(
        'Super Admin ya Admin ko delete nahi kar sakte',
      );
    }

    if (!target.roles.includes(RoleEnum.SUB_ADMIN)) {
      throw new ForbiddenException('Ye user ek sub-admin nahi hai');
    }

    await this.userRepo.remove(target);

    // Audit log
    await this.auditLogRepo.save(
      this.auditLogRepo.create({
        admin_id: deletedByAdminId,
        action: 'DELETE_SUB_ADMIN',
        resource_type: 'SUB_ADMIN',
        resource_id: targetId,
        details: {
          deleted_email: target.email,
          deleted_permissions: target.admin_permissions,
        },
      }),
    );

    return { success: true };
  }
}
