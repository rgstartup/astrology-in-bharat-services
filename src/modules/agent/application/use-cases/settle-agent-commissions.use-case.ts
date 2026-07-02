import {
  Injectable,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { DatabaseService } from '@/core/database/database.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ProfileAgent } from '../../infrastructure/entities/profile-agent.entity';
import { User } from '@/modules/users/infrastructure/entities/user.entity';
import { SystemSetting } from '@/modules/admin/infrastructure/entities/system-setting.entity';
import { WalletFacade } from '@/modules/wallet/application/wallet.facade';
import { ProfileExpert } from '@/modules/expert/profile/infrastructure/entities/profile-expert.entity';
import { ProfileClient } from '@/modules/client/profile/infrastructure/entities/profile-client.entity';

@Injectable()
export class SettleAgentCommissionsUseCase {
  constructor(
    private readonly databaseService: DatabaseService,
    @Inject(forwardRef(() => WalletFacade))
    private readonly walletFacade: WalletFacade,
    @InjectRepository(ProfileAgent)
    private readonly profileAgentRepo: Repository<ProfileAgent>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(SystemSetting)
    private readonly systemSettingRepo: Repository<SystemSetting>,
  ) {}

  async execute(userId: string) {
    return this.databaseService.transaction(async (queryRunner) => {
      const profile = await queryRunner.manager.findOne(ProfileAgent, {
        where: { user_id: userId },
      });

      if (!profile) throw new BadRequestException('Agent profile not found');

      const registeredUserIds = (profile.registered_user_ids || []).filter(
        (id) => id && typeof id === 'number',
      );
      const registeredAstrologerIds = (
        profile.registered_astrologer_ids || []
      ).filter((id) => id && typeof id === 'number');
      const allRegisteredIds = Array.from(
        new Set([...registeredUserIds, ...registeredAstrologerIds]),
      );

      const qbUsers = queryRunner.manager
        .createQueryBuilder(User, 'u')
        .leftJoinAndMapOne(
          'u.profile_expert',
          ProfileExpert,
          'pe',
          'pe.user_id = u.id',
        )
        .leftJoinAndMapOne(
          'u.profile_client',
          ProfileClient,
          'pc',
          'pc.user_id = u.id',
        )
        .where('u.referred_by_id = :agentId', { agentId: userId });

      if (allRegisteredIds.length > 0) {
        qbUsers.orWhere('u.id IN (:...ids)', { ids: allRegisteredIds });
      }

      const usersForStats = await qbUsers.getMany();

      const settings = await queryRunner.manager.find(SystemSetting, {
        where: {
          key: In([
            'COMMISSION_FROM_CLIENT',
            'COMMISSION_FROM_ASTROLOGER',
            'COMMISSION_FROM_PUJA_SHOP',
            'COMMISION_FROM_CLIENT',
            'COMMISION_FROM_ASTROLOGER',
            'COMMISION_FROM_PUJA_SHOP',
          ]),
        },
      });

      const getSettingValue = (keys: string[], defaultValue: number) => {
        const setting = settings.find((s) => keys.includes(s.key));
        return setting ? parseFloat(setting.value) : defaultValue;
      };

      const clientCommPercent = getSettingValue(
        ['COMMISSION_FROM_CLIENT', 'COMMISSION_FROM_CLIENT'],
        3,
      );
      const expertCommPercent = getSettingValue(
        ['COMMISSION_FROM_ASTROLOGER', 'COMMISSION_FROM_ASTROLOGER'],
        3,
      );

      let totalAgentCommissionCalculated = 0;
      usersForStats.forEach((uObj) => {
        const u = uObj as User & {
          profile_expert?: { total_earning?: number };
          profile_client?: { total_spending?: number };
        };
        if (u.profile_expert) {
          const earning = Number(u.profile_expert.total_earning || 0);
          totalAgentCommissionCalculated += (earning * expertCommPercent) / 100;
        }
        if (u.profile_client) {
          const spending = Number(u.profile_client.total_spending || 0);
          totalAgentCommissionCalculated +=
            (spending * clientCommPercent) / 100;
        }
      });

      const currentBalance = await this.walletFacade.getBalance(
        profile.id,
        'agent_id',
      );
      const withdrawalStats = await this.walletFacade.getWithdrawalsStatus(
        profile.id,
        'agent_id',
      );

      const totalAlreadyPaidOut =
        (Number(currentBalance) || 0) +
        (Number(withdrawalStats.total_withdrawn) || 0) +
        (Number(withdrawalStats.pending_withdrawals) || 0);

      const amountToSettle = parseFloat(
        (totalAgentCommissionCalculated - totalAlreadyPaidOut).toFixed(2),
      );

      if (amountToSettle <= 0) {
        return {
          success: true,
          message: 'All commissions already settled',
          settled_amount: 0,
        };
      }

      const { TransactionPurpose } = await import(
        '@/modules/wallet/infrastructure/entities/transaction.entity'
      );

      await this.walletFacade.credit(
        profile.id,
        'agent_id',
        amountToSettle,
        TransactionPurpose.AGENT_COMMISSION,
        'manual_settlement',
        queryRunner,
      );

      profile.total_earnings =
        Number(profile.total_earnings || 0) + amountToSettle;
      await queryRunner.manager.save(ProfileAgent, profile);

      return {
        success: true,
        message: `Successfully settled ₹${amountToSettle} into your wallet`,
        settled_amount: amountToSettle,
      };
    });
  }
}
