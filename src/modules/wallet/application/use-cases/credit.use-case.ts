import { Injectable, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Wallet } from '../../infrastructure/persistence/entities/wallet.entity';
import { Transaction, TransactionType, TransactionPurpose } from '../../infrastructure/persistence/entities/transaction.entity';
import { NotificationFacade } from '@/modules/notification/application/notification.facade';
import { NotificationGateway } from '@/modules/notification/api/gateways/notification.gateway';
import { NotificationType } from '@/modules/notification/infrastructure/persistence/entities/notification.entity';
import { ProfileExpert } from '@/modules/expert/profile/infrastructure/persistence/entities/profile-expert.entity';

@Injectable()
export class CreditUseCase {
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
  ): Promise<Wallet> {
    if (amount <= 0) throw new BadRequestException('Amount must be positive');

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      let wallet = await queryRunner.manager.findOne(Wallet, {
        where: { user_id: userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!wallet) {
        wallet = queryRunner.manager.create(Wallet, {
          user_id: userId,
          balance: 0,
          reserved_balance: 0,
        });
      }

      wallet.balance = Number(wallet.balance) + Number(amount);
      await queryRunner.manager.save(wallet);

      const transaction = queryRunner.manager.create(Transaction, {
        wallet_id: wallet.id,
        amount,
        type: TransactionType.CREDIT,
        purpose,
        reference_id: referenceId,
      });
      await queryRunner.manager.save(transaction);

      // --- NEW: Tracking Logic ---
      if (purpose === TransactionPurpose.CONSULTATION || purpose === TransactionPurpose.PRODUCT_PURCHASE) {
        const expertProfile = await queryRunner.manager.findOne(ProfileExpert, {
          where: { user: { id: userId } },
          lock: { mode: 'pessimistic_write' },
        });

        if (expertProfile) {
          expertProfile.total_earning = Number(expertProfile.total_earning || 0) + Number(amount);
          await queryRunner.manager.save(expertProfile);
        }
      }
      // ---------------------------

      await queryRunner.commitTransaction();

      // Notifications follow commit
      if (purpose === TransactionPurpose.RECHARGE) {
        const title = 'Wallet Recharged';
        const message = `Your wallet has been credited with ₹${amount}`;

        await this.notificationFacade.create(
          userId,
          NotificationType.WALLET_RECHARGE,
          title,
          message,
          { amount, referenceId },
        );

        this.notificationGateway.emitToUser(userId, 'wallet_updated', {
          type: 'credit',
          amount,
          title,
          message,
        });
      }

      return wallet;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
