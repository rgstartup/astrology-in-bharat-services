import 'dotenv/config';
import { runSeeders } from 'typeorm-extension';
import { dataSource } from '@/config/db.config';
import { ensurePostgresSchemasExist } from './utils/ensure-schemas';
import {
  AdminSeeder,
  SystemSettingSeeder,
  ConsultationTopicSeeder,
  SpecializationSeeder,
} from './seeders';

async function bootstrap() {
  const allSeeders = [
    AdminSeeder,
    SystemSettingSeeder,
    ConsultationTopicSeeder,
    SpecializationSeeder,
  ];

  // Optional: support filtering by seeder name (e.g. pnpm run seed AdminSeeder or --name=AdminSeeder)
  const args = process.argv.slice(2);
  const filterArg = args.find((a) => !a.startsWith('-')) ||
    args.find((a) => a.startsWith('--name='))?.replace('--name=', '') ||
    args.find((a) => a.startsWith('--seed='))?.replace('--seed=', '');

  const targetSeeds = filterArg
    ? allSeeders.filter((s) => s.name.toLowerCase().includes(filterArg.toLowerCase().trim()))
    : allSeeders;

  if (targetSeeds.length === 0) {
    console.warn(`No seeder matched "${filterArg}". Available: ${allSeeders.map((s) => s.name).join(', ')}`);
    process.exit(1);
  }

  await ensurePostgresSchemasExist();
  await dataSource.initialize();

  try {
    console.log(`Executing seeders: ${targetSeeds.map((s) => s.name).join(', ')}...`);
    await runSeeders(dataSource, {
      seeds: targetSeeds,
    });
    console.log('Database seeding finished successfully.');
  } finally {
    await dataSource.destroy();
  }
}

bootstrap().catch((error) => {
  console.error('Seeding failed:', error);
  process.exit(1);
});
