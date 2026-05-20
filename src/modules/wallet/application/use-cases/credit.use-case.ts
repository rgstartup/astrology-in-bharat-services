import { Injectable, BadRequestException, Logger, ForbiddenException, NotFoundException } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { Wallet } from '../../infrastructure/entities/wallet.entity';
import { Transaction, TransactionType, TransactionPurpose } from '../../infrastructure/entities/transaction.entity';
import { NotificationFacade } from '@/modules/notification/application/notification.facade';
import { NotificationGateway } from '@/modules/notification/api/gateways/notification.gateway';
import { NotificationType } from '@/modules/notification/infrastructure/entities/notification.entity';
import { ProfileExpert } from '@/modules/expert/profile/infrastructure/entities/profile-expert.entity';
import { User } from '@/modules/users/infrastructure/entities/user.entity';
import { generateTransactionNo } from '@/common/utils/transaction-no.util';
import { hasRoles } from '@/modules/users/infrastructure/enums/Role.enum';


@Injectable()
export class CreditUseCase {
  private readonly logger = new Logger(CreditUseCase.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly notificationFacade: NotificationFacade,
    private readonly notificationGateway: NotificationGateway,
  ) { }

  async execute(
    userId: number,
    amount: number,
    purpose: TransactionPurpose,
    referenceId?: string,
    externalQueryRunner?: QueryRunner,
  ): Promise<Wallet> {
    if (amount <= 0) throw new BadRequestException('Amount must be positive');

    const qr = externalQueryRunner || this.dataSource.createQueryRunner();
    
    if (!externalQueryRunner) {
      await qr.connect();
      await qr.startTransaction();
    }

    try {
      this.logger.log(`[CREDIT_TX] User: ${userId}, Amount: ${amount}, Reference: ${referenceId}`);

      // 1. Get or Create Wallet
      let wallet = await qr.manager.findOne(Wallet, {
        where: { user_id: userId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!wallet) {
        wallet = qr.manager.create(Wallet, {
          user_id: userId,
          balance: 0,
          reserved_balance: 0,
        });
        wallet = await qr.manager.save(Wallet, wallet);
      }

      // 2. Atomic Balance update via QueryBuilder
      await qr.manager.createQueryBuilder()
        .update(Wallet)
        .set({ balance: () => `balance + ${Number(amount)}` })
        .where('user_id = :userId', { userId })
        .execute();
      
      this.logger.log(`[CREDIT_TX] Balance added for user ${userId}`);

      // 3. Record Transaction with Snapshots
      const balanceBefore = Number(wallet.balance) || 0;
      const balanceAfter = balanceBefore + Number(amount);

      const transaction = qr.manager.create(Transaction, {
        wallet_id: wallet.id,
        amount: amount,
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        type: TransactionType.CREDIT,
        purpose: purpose,
        reference_id: referenceId,
      });
      const savedTx = await qr.manager.save(Transaction, transaction);

      // 3.5 Generate Custom Transaction No
      try {
        const user = await qr.manager.createQueryBuilder(User, 'u')
          .where('u.id = :userId', { userId })
          .getOne();

        if(!user){
          throw new NotFoundException(`User with id ${userId} not found`);
        }
        
        const isUserClient = hasRoles(user.roles, 'CLIENT');

        if(!isUserClient){
          throw new ForbiddenException('Only clients can have wallet transactions');
        }
        savedTx.transaction_no = generateTransactionNo('CLIENT', purpose, savedTx.id);
        await qr.manager.save(Transaction, savedTx);
      } catch (err) {
        this.logger.error(`[CREDIT_TX] Failed to generate transaction no: ${err.message}`);
      }


      // 4. Update Expert Earning Tracking
      if (purpose === TransactionPurpose.CONSULTATION || purpose === TransactionPurpose.PRODUCT_PURCHASE) {
        try {
          let expertProfile = await qr.manager.findOne(ProfileExpert, {
            where: { user_id: userId },
            select: ['id']
          });

          if (!expertProfile) {
            expertProfile = qr.manager.create(ProfileExpert, { user_id: userId });
            expertProfile = await qr.manager.save(ProfileExpert, expertProfile);
          }

          await qr.manager.createQueryBuilder()
            .update(ProfileExpert)
            .set({ total_earning: () => `COALESCE(total_earning, 0) + ${Number(amount)}` })
            .where('id = :id', { id: expertProfile.id })
            .execute();
        } catch (e) {
          this.logger.error(`[CREDIT_TX] Earning tracking failed: ${e.message}`);
        }
      }

      if (!externalQueryRunner) {
        await qr.commitTransaction();

        // Send notifications ONLY for final commit and specifically for Recharges
        if (purpose === TransactionPurpose.RECHARGE) {
          try {
            const title = 'Wallet Recharged';
            const message = `Your wallet has been credited with ₹${amount}`;
            await this.notificationFacade.create(userId, NotificationType.WALLET_RECHARGE, title, message, { amount, referenceId });
            this.notificationGateway.emitToUser(userId, 'wallet_updated', { type: 'credit', amount, title, message });
          } catch (notifErr) {
            this.logger.error(`[CREDIT_TX] Notification failed: ${notifErr.message}`);
          }
        }
      }

      const refreshedWallet = await qr.manager.findOne(Wallet, { where: { user_id: userId } });
      return refreshedWallet as Wallet;
    } catch (err) {
      if (!externalQueryRunner && qr.isTransactionActive) {
        await qr.rollbackTransaction();
      }
      this.logger.error(`[CREDIT_TX] Failed: ${err.message}`);
      throw err;
    } finally {
      if (!externalQueryRunner) {
        await qr.release();
      }
    }
  }
}
