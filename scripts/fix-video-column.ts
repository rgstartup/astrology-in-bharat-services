import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);

  try {
    console.log('Checking columns for profile_experts...');
    const columns = await dataSource.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'profile_experts';
    `);

    console.log('Columns found:', columns.map(c => c.column_name));

    const videoExists = columns.some(c => c.column_name === 'video');

    if (!videoExists) {
      console.log('Column "video" is missing. Attempting to add it...');
      await dataSource.query(`
        ALTER TABLE "profile_experts" ADD COLUMN "video" text;
      `);
      console.log('Column "video" added successfully.');
    } else {
      console.log('Column "video" already exists.');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await app.close();
  }
}

bootstrap();
