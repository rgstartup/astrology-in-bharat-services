import { Injectable } from '@nestjs/common';
import { User } from '@/modules/users/infrastructure/entities/user.entity';
import { QueryRunner } from 'typeorm';
import { AuthProfileCreationStrategy } from './auth-profile-creation.strategy';
import { AgentProfile } from '@/modules/agent/infrastructure/entities/agent-profile.entity';
import { RoleEnum } from '@/modules/users/infrastructure/enums/Role.enum';

@Injectable()
export class AgentAuthProfileCreationStrategy implements AuthProfileCreationStrategy {
    readonly role = RoleEnum.AGENT;

    async ensureProfile(user: User, queryRunner?: QueryRunner): Promise<void> {
        const repo = queryRunner
            ? queryRunner.manager.getRepository(AgentProfile)
            : null;

        if (!repo) return; // Should always have queryRunner in this flow

        const existing = await repo.findOne({ where: { user_id: user.id } });
        if (!existing) {
            const profile = new AgentProfile();
            profile.user_id = user.id;
            profile.commission_rate = 10;
            profile.total_earnings = 0;
            profile.total_registrations = 0;
            await repo.save(profile);
        }
    }
}
