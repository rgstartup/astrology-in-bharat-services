const { DataSource } = require('typeorm');
const ds = new DataSource({
  type: 'postgres',
  url: 'postgresql://postgres:postgres@localhost:5432/astrology_db', // Adjust if needed
});
async function run() {
  await ds.initialize();
  const sessions = await ds.query('SELECT id, status, is_free, price_per_minute, free_minutes FROM chat_sessions ORDER BY created_at DESC LIMIT 5;');
  console.log(sessions);
  process.exit(0);
}
run();
