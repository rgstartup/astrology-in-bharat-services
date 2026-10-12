import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import {
  earningPolicies,
  earningTiers,
} from '@/core/drizzledb/schema';
import { CreateEarningPolicyDto } from '../dto/create-earning-policy.dto';

@Injectable()
export class ManageEarningPoliciesUseCase {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async createPolicy(dto: CreateEarningPolicyDto) {
    return this.db.transaction(async (tx) => {
      const [policy] = await tx
        .insert(earningPolicies)
        .values({
          code: (dto as any).code || `POLICY_${Date.now()}`,
          name: dto.name,
          category: (dto as any).category || 'consultation',
          type: (dto as any).type || 'realtime_consultation',
          currency: (dto as any).currency || 'INR',
          effective_from: dto.effective_from
            ? new Date(dto.effective_from)
            : new Date(),
          effective_until: dto.effective_to
            ? new Date(dto.effective_to)
            : null,
        })
        .returning();

      if (dto.tiers && dto.tiers.length > 0) {
        await tx.insert(earningTiers).values(
          dto.tiers.map((t) => ({
            policy_id: policy.id,
            min_threshold: String(t.min_threshold),
            max_threshold:
              t.max_threshold !== undefined && t.max_threshold !== null
                ? String(t.max_threshold)
                : null,
            platform_rate: String(t.platform_rate),
            agent_rate: String(t.agent_rate ?? 0),
          })),
        );
      }

      return policy;
    });
  }

  async listPolicies() {
    return this.db.query.earningPolicies.findMany({
      orderBy: [desc(earningPolicies.created_at)],
    });
  }

  async getPolicyById(id: number) {
    const policy = await this.db.query.earningPolicies.findFirst({
      where: eq(earningPolicies.id, id),
    });
    if (!policy) throw new NotFoundException('Earning policy not found');
    return policy;
  }
}

