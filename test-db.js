const { Client } = require("pg");
const client = new Client({ connectionString: "postgresql://neondb_owner:npg_r94TzaWBnjVv@ep-wispy-sky-a1j6w3i2-pooler.ap-southeast-1.aws.neon.tech/aibdb?sslmode=require" });
client.connect().then(() => {
  return client.query("SELECT id, user_id, profile_picture FROM client.profile WHERE user_id = '019e6d6c-a827-758a-b42d-88e6dd4781da';");
}).then(res => {
  console.log("CLIENT PROFILES:", res.rows);
  client.end();
}).catch(console.error);
