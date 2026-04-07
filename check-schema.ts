import { dataSource } from './src/config/db.config';

async function checkSchema() {
  try {
    await dataSource.initialize();
    const queryRunner = dataSource.createQueryRunner();
    const columns = await queryRunner.getTable('support_disputes');
    console.log('Columns in support_disputes:', columns?.columns.map(c => c.name));
    await dataSource.destroy();
  } catch (err) {
    console.error('Error checking schema:', err);
  }
}

checkSchema();
