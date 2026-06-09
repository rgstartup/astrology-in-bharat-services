import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { GetAdminListingsUseCase } from './src/modules/agent/application/use-cases/get-admin-listings.use-case';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const useCase = app.get(GetAdminListingsUseCase);
  
  try {
    const result = await useCase.execute({ type: 'puja_shop', search: '' });
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('ERROR OCCURRED:');
    console.error(err);
  }
  
  await app.close();
}
bootstrap();
