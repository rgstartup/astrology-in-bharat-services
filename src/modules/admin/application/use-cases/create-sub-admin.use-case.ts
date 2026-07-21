// src/modules/admin/application/use-cases/create-sub-admin.use-case.ts
import {
  Injectable,
  ConflictException,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '@/modules/users/infrastructure/entities/user.entity';
import { RoleEnum } from '@/modules/users/infrastructure/enums/Role.enum';
import { AdminPermission } from '@/modules/users/infrastructure/enums/AdminPermission.enum';
import { IHasherToken, IHasher } from '@/common/contracts/hasher.contract';
import { AdminAuditLog } from '../../infrastructure/entities/admin-audit-log.entity';

export interface CreateSubAdminInput {
  name: string;
  email: string;
  password: string;
  permissions: AdminPermission[];
  createdByAdminId: string;
}

@Injectable()
export class CreateSubAdminUseCase {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(AdminAuditLog)
    private readonly auditLogRepo: Repository<AdminAuditLog>,
    @Inject(IHasherToken)
    private readonly hasher: IHasher,
  ) {}

  async execute(input: CreateSubAdminInput): Promise<Omit<User, 'password'>> {
    // Check karo ki email pehle se exist to nahi karta
    const existing = await this.userRepo.findOne({
      where: { email: input.email },
    });

    if (existing) {
      throw new ConflictException(
        'Is email se pehle se ek user register hai',
      );
    }

    // Password hash karo — kabhi plain text save nahi karna!
    const hashedPassword = await this.hasher.hash(input.password);

    // Naya sub-admin create karo
    const subAdmin = this.userRepo.create({
      name: input.name,
      email: input.email,
      password: hashedPassword,
      roles: [RoleEnum.SUB_ADMIN],
      admin_permissions: input.permissions,
      email_verified_at: new Date(), // Admin ne banaya hai — verify consider karo
    });

    const saved = await this.userRepo.save(subAdmin);

    // Audit log: kisne banaya, kab banaya, kya permissions di
    await this.auditLogRepo.save(
      this.auditLogRepo.create({
        admin_id: input.createdByAdminId,
        action: 'CREATE_SUB_ADMIN',
        resource_type: 'SUB_ADMIN',
        resource_id: saved.id,
        details: {
          sub_admin_email: input.email,
          permissions_granted: input.permissions,
        },
      }),
    );

    // Password return mat karo
    const { password: _pw, ...result } = saved as any;
    return result;
  }
}
