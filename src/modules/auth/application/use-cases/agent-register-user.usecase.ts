import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as crypto from 'crypto';
import { UsersFacade } from '@/modules/users/application/users.facade';
import { AgentProfile } from '@/modules/agent/infrastructure/persistence/entities/agent-profile.entity';
import { ProfileExpert } from '@/modules/expert/profile/infrastructure/persistence/entities/profile-expert.entity';
import { ProfileClient } from '@/modules/client/profile/infrastructure/persistence/entities/profile-client.entity';
import { User } from '@/modules/users/infrastructure/persistence/entities/user.entity';
import { UserRepository } from '@/modules/users/infrastructure/persistence/repositories/user.repository';

export class AgentRegisterUserDto {
  better_auth_user_id: string;
  email: string;
  name: string;
  roles: string[];
  phone?: string;
}

@Injectable()
export class AgentRegisterUserUseCase {
  private readonly logger = new Logger(AgentRegisterUserUseCase.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly usersFacade: UsersFacade,
    private readonly userRepository: UserRepository,
  ) {}

  async execute(dto: AgentRegisterUserDto, agentBetterAuthId: string) {
    const isExpert = dto.roles.includes('expert');
    const role = isExpert ? 'expert' : 'client';

    const existingUser = await this.usersFacade.findByEmail(dto.email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    const agentLocalUser = await this.userRepository.findByBetterAuthId(agentBetterAuthId);
    if (!agentLocalUser) {
      throw new Error('Agent local profile not found');
    }
    const agentLocalId = agentLocalUser.id;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let createdUser: User;
    try {
      const suffix = crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 6);
      const uid = isExpert ? `AIB-EXP-${suffix}` : `AIB-USR-${suffix}`;

      createdUser = queryRunner.manager.create(User, {
        better_auth_user_id: dto.better_auth_user_id,
        email: dto.email,
        name: dto.name,
        role,
        uid,
        referred_by_id: agentLocalId,
      });
      createdUser = await queryRunner.manager.save(User, createdUser);

      if (isExpert) {
        const profile = queryRunner.manager.create(ProfileExpert, {
          better_auth_user_id: dto.better_auth_user_id,
          phone_number: dto.phone,
        });
        await queryRunner.manager.save(ProfileExpert, profile);
      } else {
        const profile = queryRunner.manager.create(ProfileClient, {
          better_auth_user_id: dto.better_auth_user_id,
          phone: dto.phone,
        });
        await queryRunner.manager.save(ProfileClient, profile);
      }

      const agentProfile = await queryRunner.manager.findOne(AgentProfile, { where: { user_id: agentLocalId } });
      if (agentProfile) {
        const field = isExpert ? 'registered_astrologer_ids' : 'registered_user_ids';
        agentProfile[field] = [...(agentProfile[field] || []), createdUser.id];
        await queryRunner.manager.save(AgentProfile, agentProfile);
        await queryRunner.manager.increment(AgentProfile, { user_id: agentLocalId }, 'total_registrations', 1);
      }

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to register user by agent ${agentBetterAuthId}`, error.stack);
      throw error;
    } finally {
      await queryRunner.release();
    }

    return { success: true, user: createdUser };
  }
}
