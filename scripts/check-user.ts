import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';

async function checkUser() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const dataSource = app.get(DataSource);

    const users = await dataSource.query(
        `SELECT 
            u.id, 
            u.email, 
            u.name, 
            u.role,
            array_agg(r.name) as roles 
        FROM users u 
        LEFT JOIN user_roles ur ON u.id = ur.user_id 
        LEFT JOIN roles r ON ur.role_id = r.id 
        WHERE u.email = $1 
        GROUP BY u.id, u.email, u.name, u.role`,
        ['ravirai84272@gmail.com']
    );

    console.log('\n=== Users with email ravirai84272@gmail.com ===\n');
    console.log(JSON.stringify(users, null, 2));
    console.log(`\nTotal users found: ${users.length}\n`);

    await app.close();
}

checkUser()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error('Error:', err);
        process.exit(1);
    });
