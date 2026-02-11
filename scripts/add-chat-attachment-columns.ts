import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const dataSource = app.get(DataSource);

    try {
        console.log('Checking columns for chat_messages...');
        const columns = await dataSource.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'chat_messages';
    `);

        const colNames = columns.map(c => c.column_name);
        console.log('Columns found:', colNames);

        if (!colNames.includes('attachmentUrl')) {
            console.log('Column "attachmentUrl" is missing. Attempting to add it...');
            await dataSource.query(`
        ALTER TABLE "chat_messages" ADD COLUMN "attachmentUrl" text;
      `);
            console.log('Column "attachmentUrl" added successfully.');
        } else {
            console.log('Column "attachmentUrl" already exists.');
        }

        if (!colNames.includes('attachmentType')) {
            console.log('Column "attachmentType" is missing. Attempting to add it...');
            await dataSource.query(`
        ALTER TABLE "chat_messages" ADD COLUMN "attachmentType" text;
      `);
            console.log('Column "attachmentType" added successfully.');
        } else {
            console.log('Column "attachmentType" already exists.');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await app.close();
    }
}

bootstrap();
