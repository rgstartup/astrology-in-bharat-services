import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { getDataSourceToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { getErrorMessage } from './common/utils/get-error-message.util';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get<DataSource>(getDataSourceToken());

  console.log('Clearing Places and Image Caches...');
  try {
    await dataSource.query(
      'TRUNCATE TABLE content.places_cache RESTART IDENTITY CASCADE;',
    );
    await dataSource.query(
      'TRUNCATE TABLE content.place_images_cache RESTART IDENTITY CASCADE;',
    );
    console.log('Cache Cleared Successfully!');
  } catch (error) {
    console.error('Error clearing cache:', getErrorMessage(error));
  } finally {
    await app.close();
    process.exit(0);
  }
}

void bootstrap();
