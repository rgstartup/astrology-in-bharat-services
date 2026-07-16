const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://neondb_owner:npg_a3hdzb7leXnF@ep-dark-snow-atxxy0vr-pooler.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require' });
async function run() {
  await client.connect();
  const res1 = await client.query("SELECT id, avatar FROM users WHERE id = '019f69a3-d869-76bb-9a91-3047deafb3aa'");
  console.log("USERS:", res1.rows);
  const res2 = await client.query("SELECT id, profile_picture FROM client.profile WHERE id = '019f69a5-674a-79f1-8e6e-0fa80670260b'");
  console.log("CLIENT.PROFILE:", res2.rows);
  await client.end();
}
run();
