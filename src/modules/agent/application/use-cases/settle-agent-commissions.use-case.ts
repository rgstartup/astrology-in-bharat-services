import {
  Injectable,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { DatabaseService } from '@/core/database/database.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfileAgent } from '../../infrastructure/entities/profile-agent.entity';
import { User } from '@/modules/users/infrastructure/entities/user.entity';
import { WalletFacade } from '@/modules/finance/wallet/application/wallet.facade';
import { ProfileExpert } from '@/modules/expert/profile/infrastructure/entities/profile-expert.entity';
import { ProfileClient } from '@/modules/client/profile/infrastructure/entities/profile-client.entity';
import {
  CommissionsFacade,
  CommissionEventType,
  CommissionType,
  CommissionAppliesRole,
} from '@/modules/finance/commissions/application/commissions.facade';

@Injectable()
export class SettleAgentCommissionsUseCase {
  constructor(
    private readonly databaseService: DatabaseService,
    @Inject(forwardRef(() => WalletFacade))
    private readonly walletFacade: WalletFacade,
    private readonly commissionsFacade: CommissionsFacade,
    @InjectRepository(ProfileAgent)
    private readonly profileAgentRepo: Repository<ProfileAgent>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
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

      let totalAgentCommissionCalculated = 0;
      for (const uObj of usersForStats) {
        const u = uObj as User & {
          profile_expert?: { id?: string; total_earning?: number };
          profile_client?: { id?: string; total_spending?: number };
        };
        if (u.profile_expert) {
          const earning = Number(u.profile_expert.total_earning || 0);
          if (earning > 0) {
            const { amount } = await this.commissionsFacade.resolveCommission(
              CommissionEventType.CHAT,
              CommissionType.SELLER_AGENT,
              u.profile_expert.id ?? null,
              CommissionAppliesRole.EXPERT,
              earning,
            );
            totalAgentCommissionCalculated += amount;
          }
        }
        if (u.profile_client) {
          const spending = Number(u.profile_client.total_spending || 0);
          if (spending > 0) {
            const { amount } = await this.commissionsFacade.resolveCommission(
              CommissionEventType.CHAT,
              CommissionType.BUYER_AGENT,
              u.profile_client.id ?? null,
              CommissionAppliesRole.CLIENT,
              spending,
            );
            totalAgentCommissionCalculated += amount;
          }
        }
      }

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
        '@/modules/finance/wallet/infrastructure/entities/transaction.entity'
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
