
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
dotenv.config();

async function check() {
    const ds = new DataSource({
        type: 'postgres',
        url: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
    });
    await ds.initialize();
    const res = await ds.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'users'");
    console.log(res.map(c => c.column_name));
    await ds.destroy();
}
check();
