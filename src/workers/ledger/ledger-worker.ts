process.env.TZ = 'UTC';

import { NestFactory } from '@nestjs/core';
import { LedgerWorkerModule } from './ledger-worker.module';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(LedgerWorkerModule);
  await app.init();
  console.log('Ledger Worker started — listening for general_ledger jobs...');

  app.enableShutdownHooks();
  setInterval(() => {}, 1000 * 60 * 60);
}
bootstrap().catch((err) => console.error('Error starting Ledger Worker:', err));
