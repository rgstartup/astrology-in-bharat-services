import * as dotenv from 'dotenv';
import { createConnection } from 'typeorm';

dotenv.config();

async function check() {
    const connection = await createConnection({
        type: 'postgres',
        url: process.env.DATABASE_URL,
        entities: ['src/**/*.entity.ts'],
        synchronize: false,
    });

    const orders = await connection.query('SELECT * FROM payment_orders ORDER BY "createdAt" DESC LIMIT 5');
    console.log('Recent Orders:', JSON.stringify(orders, null, 2));

    await connection.close();
}

check().catch(console.error);
