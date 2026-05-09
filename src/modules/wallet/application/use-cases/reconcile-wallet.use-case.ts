import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Wallet } from '../../infrastructure/entities/wallet.entity';
import { Transaction, TransactionType } from '../../infrastructure/entities/transaction.entity';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class ReconcileWalletUseCase {
    private readonly logger = new Logger(ReconcileWalletUseCase.name);

    constructor(
        @InjectRepository(Wallet)
        private readonly walletRepository: Repository<Wallet>,
        @InjectRepository(Transaction)
        private readonly transactionRepository: Repository<Transaction>,
        private readonly dataSource: DataSource,
    ) { }

    @Cron(CronExpression.EVERY_DAY_AT_3AM)
    async handleCron() {
        this.logger.log('Starting daily wallet reconciliation audit...');
        await this.execute();
    }

    async execute() {
        const wallets = await this.walletRepository.find();
        const mismatches: any[] = [];

        for (const wallet of wallets) {
            const result = await this.transactionRepository
                .createQueryBuilder('t')
                .where('t.wallet_id = :walletId', { walletId: wallet.id })
                .select(
                    `SUM(CASE WHEN t.type = '${TransactionType.CREDIT}' THEN t.amount ELSE -t.amount END)`,
                    'sum'
                )
                .getRawOne();

            const ledgerBalance = Number(result.sum || 0);
            const actualBalance = Number(wallet.balance);

            // Use a small epsilon for decimal comparison
            if (Math.abs(ledgerBalance - actualBalance) > 0.01) {
                mismatches.push({
                    wallet_id: wallet.id,
                    user_id: wallet.user_id,
                    ledgerBalance,
                    actualBalance,
                    diff: ledgerBalance - actualBalance
                });
            }
        }

        if (mismatches.length > 0) {
            this.logger.error(`RECONCILIATION FAILURE: ${mismatches.length} wallets have balance mismatches!`);
            console.table(mismatches);
            // In a real system, send email/Slack alert here
        } else {
            this.logger.log('Reconciliation successful. All wallets are in sync with the ledger.');
        }

        return {
            success: mismatches.length === 0,
            mismatches
        };
    }
}
