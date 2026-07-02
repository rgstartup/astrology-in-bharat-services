import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import {
  Withdrawal,
  WithdrawalStatus,
} from '../../infrastructure/entities/withdrawal.entity';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class StuckWithdrawalJob {
  private readonly logger = new Logger(StuckWithdrawalJob.name);

  constructor(
    @InjectRepository(Withdrawal)
    private readonly withdrawalRepository: Repository<Withdrawal>,
  ) {}

  @Cron(CronExpression.EVERY_6_HOURS)
  async handleCron() {
    this.logger.log('Running stuck withdrawal detection job...');

    // Find withdrawals stuck in PROCESSING for more than 24 hours
    const oneDayAgo = new Date();
    oneDayAgo.setHours(oneDayAgo.getHours() - 24);

    const stuckWithdrawals = await this.withdrawalRepository.find({
      where: {
        status: WithdrawalStatus.PROCESSING,
        updated_at: LessThan(oneDayAgo),
      },
    });

    if (stuckWithdrawals.length > 0) {
      this.logger.warn(
        `Detected ${stuckWithdrawals.length} withdrawals stuck in PROCESSING for >24 hours!`,
      );

      for (const withdrawal of stuckWithdrawals) {
        this.logger.warn(
          `Stuck Withdrawal ID: ${withdrawal.id}, Expert/Merchant/Agent ID: ${withdrawal.expert_id || withdrawal.merchant_id || withdrawal.agent_profile_id}, Amount: ${withdrawal.amount}`,
        );

        // Add a remark to bring it to admin's attention if not already flagged
        if (!withdrawal.remark?.includes('STUCK_DETECTED')) {
          withdrawal.remark = `[STUCK_DETECTED] ${withdrawal.remark || ''}`;
          await this.withdrawalRepository.save(withdrawal);
        }
      }
    } else {
      this.logger.log('No stuck withdrawals detected.');
    }
  }
}
