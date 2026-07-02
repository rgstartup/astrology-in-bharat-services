process.env.TZ = 'UTC'; // Force UTC timezone globally

import { NestFactory } from '@nestjs/core';
import { EmailWorkerModule } from './modules/email-worker/email-worker.module';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(EmailWorkerModule);
  await app.init();
  console.log(
    '🚀 Email Worker Process successfully started and listening for jobs...',
  );

  // Handle graceful shutdown
  app.enableShutdownHooks();

  // Keep the standalone process alive
  setInterval(() => {}, 1000 * 60 * 60);
}
bootstrap().catch((err) => console.error('Error starting Email Worker:', err));
