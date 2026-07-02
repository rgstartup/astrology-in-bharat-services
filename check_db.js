const { DataSource } = require('typeorm');
const ds = new DataSource({
  type: 'postgres',
  url: 'postgresql://postgres:postgres@localhost:5432/astrology_in_bharat'
});
ds.initialize().then(async () => {
  const res = await ds.query("SELECT u.name, u.avatar as user_avatar, p.avatar as profile_avatar FROM users u LEFT JOIN expert.profile p ON p.user_id = u.id WHERE u.name ILIKE '%Ravi Rai Rg Startup%'");
  console.log(res);
  process.exit(0);
}).catch(console.error);
