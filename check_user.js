const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://neondb_owner:npg_a3hdzb7leXnF@ep-dark-snow-atxxy0vr-pooler.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

async function checkUser() {
  await client.connect();
  const email = 'Rr2252698@Gmail.com';
  try {
    const res = await client.query('SELECT id FROM users WHERE email ILIKE $1', [email]);
    if (res.rows.length === 0) { console.log('User not found.'); return; }
    const userId = res.rows[0].id;
    console.log(`Found user ID: ${userId}`);
    // Check client profile
    const profileRes = await client.query('SELECT name, email, phone, gender, marital_status, occupation, date_of_birth, time_of_birth, place_of_birth FROM client.profile WHERE user_id = $1', [userId]);
    if (profileRes.rows.length > 0) {
        console.log('Profile details:', profileRes.rows[0]);
    } else {
        console.log('Profile not found for this user.');
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}
checkUser();
