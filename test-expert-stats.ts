import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { GetExpertStatsUseCase } from './src/modules/users/application/use-cases/get-expert-stats.usecase';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const useCase = app.get(GetExpertStatsUseCase);
  
  try {
    const stats = await useCase.execute();
    console.log(stats);
  } catch (e) {
    console.error('Error executing use case:', e);
  }

  await app.close();
}
bootstrap();
