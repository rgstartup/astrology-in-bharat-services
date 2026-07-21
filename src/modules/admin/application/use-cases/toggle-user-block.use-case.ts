// src/modules/admin/application/use-cases/toggle-user-block.use-case.ts
// Ye use-case user ko block ya unblock karta hai aur AdminAuditLog mein record karta hai
// taaki hamesha pata rahe ki kis admin ne kya action liya.

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '@/modules/users/infrastructure/entities/user.entity';
import { AdminAuditLog } from '../../infrastructure/entities/admin-audit-log.entity';

export interface ToggleUserBlockInput {
  targetUserId: string;  // Jis user ko block/unblock karna hai
  isBlocked: boolean;    // true = block, false = unblock
  adminId: string;       // Action perform karne wala admin/sub-admin ki ID
  adminName: string;     // Admin ka naam (frontend par dikhane ke liye)
}

@Injectable()
export class ToggleUserBlockUseCase {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    @InjectRepository(AdminAuditLog)
    private readonly auditLogRepo: Repository<AdminAuditLog>,
  ) {}

  async execute(input: ToggleUserBlockInput): Promise<{ success: boolean }> {
    const { targetUserId, isBlocked, adminId, adminName } = input;

    // User exist karta hai ya nahi check karo
    const user = await this.userRepo.findOne({ where: { id: targetUserId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // User ka is_blocked status update karo
    // Agar block kar rahe hain: blocked_by_id, blocked_by_name, blocked_at bhi save karo
    // Agar unblock kar rahe hain: in fields ko null kar do
    await this.userRepo.update(targetUserId, {
      is_blocked: isBlocked,
      blocked_by_id: isBlocked ? adminId : null,
      blocked_by_name: isBlocked ? adminName : null,
      blocked_at: isBlocked ? new Date() : null,
    });

    // AdminAuditLog mein record save karo
    await this.auditLogRepo.save(
      this.auditLogRepo.create({
        admin_id: adminId,
        action: isBlocked ? 'BLOCK_USER' : 'UNBLOCK_USER',
        resource_type: 'USER',
        resource_id: targetUserId,
        details: {
          target_user_email: user.email,
          target_user_name: user.name,
          action_by_name: adminName,
          previous_status: user.is_blocked ? 'blocked' : 'active',
          new_status: isBlocked ? 'blocked' : 'active',
        },
      }),
    );

    return { success: true };
  }
}
