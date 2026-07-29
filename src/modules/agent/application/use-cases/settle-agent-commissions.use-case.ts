import {
  Injectable,
  BadRequestException,
} from '@nestjs/common';
import { DatabaseService } from '@/core/database/database.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfileAgent } from '../../infrastructure/entities/profile-agent.entity';
import { User } from '@/modules/users/infrastructure/entities/user.entity';
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

      // Instead of WalletFacade, fetch balances natively via raw query
      const walletRes = await queryRunner.manager.query(
        `SELECT id, balance FROM finance.wallets WHERE agent_id = $1`,
        [profile.id]
      );
      
      let walletId: string | null = null;
      let currentBalance = 0;

      if (walletRes.length === 0) {
        // Create wallet if doesn't exist
        const newWallet = await queryRunner.manager.query(
          `INSERT INTO finance.wallets (agent_id, balance) VALUES ($1, 0) RETURNING id`,
          [profile.id]
        );
        walletId = newWallet[0].id;
      } else {
        walletId = walletRes[0].id;
        currentBalance = Number(walletRes[0].balance);
      }

      const withdrawalStatsQuery = await queryRunner.manager.query(
        `
        SELECT 
            SUM(amount) FILTER(WHERE status = 'pending')::float as pending_amount,
            SUM(amount) FILTER(WHERE status = 'processing')::float as processing_amount,
            SUM(amount) FILTER(WHERE status = 'completed')::float as total_withdrawn
        FROM finance.withdrawals 
        WHERE profile_id = $1 AND profile_type = 'agent_id'
        `,
        [profile.id]
      );
      
      const wStats = withdrawalStatsQuery[0] || {};
      const totalAlreadyPaidOut =
        currentBalance +
        (Number(wStats.total_withdrawn) || 0) +
        (Number(wStats.pending_amount) || 0) + 
        (Number(wStats.processing_amount) || 0);

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

      const { TransactionPurpose, TransactionType } = await import(
        '@/modules/finance/wallet/infrastructure/entities/transaction.entity'
      );

      // Insert credit transaction
      await queryRunner.manager.query(
        `INSERT INTO finance.transactions (wallet_id, amount, type, purpose, reference_id) VALUES ($1, $2, $3, $4, $5)`,
        [walletId, amountToSettle, TransactionType.CREDIT, TransactionPurpose.AGENT_COMMISSION, 'manual_settlement']
      );

      // Update wallet balance
      await queryRunner.manager.query(
        `UPDATE finance.wallets SET balance = balance + $1, updated_at = NOW() WHERE id = $2`,
        [amountToSettle, walletId]
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
