const { DataSource } = require('typeorm');
const ds = new DataSource({
  type: 'postgres',
  url: 'postgresql://neondb_owner:npg_r94TzaWBnjVv@ep-wispy-sky-a1j6w3i2-pooler.ap-southeast-1.aws.neon.tech/aibdb?sslmode=require&channel_binding=require'
});
ds.initialize().then(async () => {
  const res = await ds.query("SELECT * FROM client.profile WHERE user_id = '019e6d6c-a827-758a-b42d-88e6dd4781da'");
  console.log(res);
  process.exit(0);
}).catch(console.error);
