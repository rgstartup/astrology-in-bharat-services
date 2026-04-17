import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { DatabaseService } from '../src/core/database/database.service';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const db = app.get(DatabaseService);

    console.log('--- Migrating AgentProfile columns ---');

    await db.transaction(async (qr) => {
        const columns = [
            { name: 'bank_name', type: 'varchar', nullable: true },
            { name: 'account_number', type: 'varchar', nullable: true },
            { name: 'ifsc_code', type: 'varchar', nullable: true },
            { name: 'account_holder', type: 'varchar', nullable: true },
            { name: 'phone', type: 'varchar', nullable: true },
            { name: 'address', type: 'varchar', nullable: true },
            { name: 'city', type: 'varchar', nullable: true },
            { name: 'state', type: 'varchar', nullable: true },
            { name: 'aadhaar_no', type: 'varchar', nullable: true },
            { name: 'pan_no', type: 'varchar', nullable: true },
            { name: 'aadhaar_doc', type: 'varchar', nullable: true },
            { name: 'pan_doc', type: 'varchar', nullable: true },
        ];

        for (const col of columns) {
            try {
                await qr.query(`ALTER TABLE agent_profiles ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}`);
                console.log(`Column ${col.name} checked/added.`);
            } catch (err) {
                console.error(`Error adding column ${col.name}:`, err.message);
            }
        }
    });

    console.log('--- Migration complete ---');
    await app.close();
}

bootstrap();
