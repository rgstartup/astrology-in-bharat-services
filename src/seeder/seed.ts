import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { SeederModule } from './seeder.module';
import { SeederService } from './seeder.service';
import { SeederRunOptions } from './interfaces/seeder.interface';

import { ensurePostgresSchemasExist } from './utils/ensure-schemas';

async function bootstrap() {
  const logger = new Logger('SeederCLI');
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    // eslint-disable-next-line no-console
    console.log(`
TypeORM Seeder CLI - Usage:
  pnpm run seed                 Run all registered seeders
  pnpm run seed --refresh       Drop existing seeded data and re-run all seeders
  pnpm run seed --name=<Name>   Run specific seeder (e.g. --name=AdminSeeder)
  pnpm run seed <Name>          Run specific seeder by positional argument
  pnpm run seed --list          List all available seeders
  pnpm run seed --help          Show this help message
`);
    process.exit(0);
  }

  // Ensure all postgres schemas exist before TypeORM connects and synchronizes
  await ensurePostgresSchemasExist();

  const app = await NestFactory.createApplicationContext(SeederModule, {
    logger: ['log', 'error', 'warn', 'debug'],
  });

  try {
    const seederService = app.get(SeederService);

    if (args.includes('--list') || args.includes('-l')) {
      const names = seederService.getRegisteredSeederNames();
      logger.log(`Available Seeders (${names.length}):\n - ` + names.join('\n - '));
      await app.close();
      process.exit(0);
    }

    const options: SeederRunOptions = {};

    if (args.includes('--refresh')) {
      options.refresh = true;
    }

    // Parse specific seeder names (--name=AdminSeeder or --seed=AdminSeeder or positional args)
    const specificSeeders: string[] = [];
    for (const arg of args) {
      if (arg.startsWith('--name=')) {
        specificSeeders.push(arg.replace('--name=', '').trim());
      } else if (arg.startsWith('--seed=')) {
        specificSeeders.push(arg.replace('--seed=', '').trim());
      } else if (!arg.startsWith('-')) {
        specificSeeders.push(arg.trim());
      }
    }

    if (specificSeeders.length > 0) {
      options.seeders = specificSeeders;
    }

    await seederService.run(options);
    logger.log('Database seeding finished successfully.');
    await app.close();
    process.exit(0);
  } catch (error) {
    logger.error('Seeding process failed.', error instanceof Error ? error.stack : error);
    await app.close();
    process.exit(1);
  }
}

bootstrap();
