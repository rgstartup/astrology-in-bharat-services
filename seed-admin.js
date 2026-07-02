const { Client } = require('pg');
const argon2 = require('argon2');
const crypto = require('crypto');

async function seed() {
  const client = new Client({
    connectionString: 'postgresql://neondb_owner:npg_r94TzaWBnjVv@ep-wispy-sky-a1j6w3i2-pooler.ap-southeast-1.aws.neon.tech/aibdb?sslmode=require'
  });
  
  await client.connect();
  
  const email = 'admin@gmail.com';
  const password = '123456';
  
  const res = await client.query('SELECT * FROM users WHERE email = $1', [email]);
  if (res.rows.length > 0) {
    console.log('Admin already exists with ID:', res.rows[0].id);
    await client.end();
    return;
  }
  
  const hashedPassword = await argon2.hash(password);
  const id = crypto.randomUUID();
  
  try {
    await client.query(
      `INSERT INTO users (id, name, email, password, roles, email_verified_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [id, 'Admin', email, hashedPassword, ['admin']]
    );
    console.log('Admin created successfully with ID:', id);
  } catch(e) {
    console.log('Error creating admin:', e);
  }
  
  await client.end();
}

seed();
