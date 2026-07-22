import { Injectable } from '@nestjs/common';
import { BooleanMessage } from '@/common/dto/boolean-message.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfileAgent } from '../../infrastructure/entities/profile-agent.entity';
import { Notification, NotificationType } from '@/modules/notification/infrastructure/entities/notification.entity';
import { NotificationGateway } from '@/modules/notification/api/gateways/notification.gateway';
import { RoleEnum } from '@/modules/users/infrastructure/enums/Role.enum';
import { DatabaseService } from '@/core/database/database.service';
import { IUser } from '@/common/types/access-token.payload';

@Injectable()
export class UpdateAgentProfileUseCase {
  constructor(
    @InjectRepository(ProfileAgent)
    private readonly profileAgentRepo: Repository<ProfileAgent>,
    private readonly notificationGateway: NotificationGateway,
    private readonly databaseService: DatabaseService,
  ) {}

  async execute(
    user: IUser,
    body: {
      bank_name?: string;
      account_number?: string;
      ifsc_code?: string;
      account_holder?: string;
      bank_accounts?: unknown;
    },
  ) {
    const userId = user.id;
    await this.databaseService.transaction(async (queryRunner) => {
      const whereClause = user.profile
        ? { id: user.profile, user_id: userId }
        : { user_id: userId };
      const currentProfile = await queryRunner.manager.findOne(ProfileAgent, {
        where: whereClause,
      });

      // Check if bank details are changing
      const bankDetailsChanged =
        body.bank_name !== currentProfile?.bank_name ||
        body.account_number !== currentProfile?.account_number ||
        JSON.stringify(body.bank_accounts) !==
          JSON.stringify(currentProfile?.bank_accounts);

      await queryRunner.manager.update(
        ProfileAgent,
        user.profile ? { id: user.profile } : { user_id: userId },
        {
          bank_name: body.bank_name,
          account_number: body.account_number,
          ifsc_code: body.ifsc_code,
          account_holder: body.account_holder,
          bank_accounts: body.bank_accounts as any,
        },
      );

      if (bankDetailsChanged && currentProfile) {
        const notification = queryRunner.manager.create(Notification, {
          agent_id: currentProfile.id,
          type: NotificationType.GENERAL,
          title: 'Security Alert: Bank Details Updated',
          message: 'Your bank account information has been updated. If you did not make this change, please contact support immediately for security.',
          metadata: { type: 'security_alert', timestamp: new Date() },
        });
        await queryRunner.manager.save(Notification, notification);
        this.notificationGateway.emitToProfile(currentProfile.id, 'notification', notification);
      }
    });

    return new BooleanMessage();
  }
}
