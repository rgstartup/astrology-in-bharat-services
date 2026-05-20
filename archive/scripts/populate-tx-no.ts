import { DataSource, IsNull } from 'typeorm';
import { Withdrawal } from '../../src/modules/wallet/infrastructure/entities/withdrawal.entity';
import { Transaction, TransactionPurpose } from '../../src/modules/wallet/infrastructure/entities/transaction.entity';
import { User } from '../../src/modules/users/infrastructure/entities/user.entity';
import { generateTransactionNo } from '../../src/common/utils/transaction-no.util';

import * as dotenv from 'dotenv';

dotenv.config();

async function migrate() {
    const dataSource = new DataSource({
        type: 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        username: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD || 'root',
        database: process.env.DB_DATABASE || 'astrology_in_bharat',
        entities: [Withdrawal, Transaction, User],
        synchronize: false,
    });

    await dataSource.initialize();
    console.log('Database connected for migration');

    // 1. Update Withdrawals
    const withdrawals = await dataSource.getRepository(Withdrawal).find({
        where: { withdrawal_no: IsNull() },
        relations: ['user', 'user.roles']
    });

    console.log(`Found ${withdrawals.length} withdrawals to update`);

    for (const w of withdrawals) {
        const role = w.user?.roles?.[0]?.name || 'user';
        (w as any).withdrawal_no = generateTransactionNo(role, TransactionPurpose.WITHDRAWAL, w.id);
        await dataSource.getRepository(Withdrawal).save(w);
        console.log(`Updated Withdrawal ID ${w.id} -> ${(w as any).withdrawal_no}`);
    }

    // 2. Update Transactions
    const transactions = await dataSource.getRepository(Transaction).find({
        where: { transaction_no: IsNull() },
        relations: ['wallet']
    });

    console.log(`Found ${transactions.length} transactions to update`);

    for (const t of transactions) {
        // Need to join wallet -> user -> roles
        const user = await dataSource.getRepository(User).createQueryBuilder('u')
            .innerJoin('wallets', 'wal', 'wal.user_id = u.id')
            .where('wal.id = :walletId', { walletId: t.wallet_id })
            .getOne();

        const role = user.roles;
        (t as any).transaction_no = generateTransactionNo(role, t.purpose, t.id);
        await dataSource.getRepository(Transaction).save(t);
        console.log(`Updated Transaction ID ${t.id} -> ${(t as any).transaction_no}`);
    }


    await dataSource.destroy();
    console.log('Migration completed');
}

migrate().catch(err => console.error(err));
