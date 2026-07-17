const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://neondb_owner:npg_a3hdzb7leXnF@ep-dark-snow-atxxy0vr-pooler.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

async function deleteUser() {
  await client.connect();
  const email = 'Rr2252698@Gmail.com'; 
  try {
    const res = await client.query('SELECT id FROM users WHERE email ILIKE $1', [email]);
    if (res.rows.length === 0) {
      console.log('User not found.');
      return;
    }
    const userId = res.rows[0].id;
    console.log(`Found user ID: ${userId}. Deleting related records...`);

    // Find profile
    const profileRes = await client.query('SELECT id FROM client.profile WHERE user_id = $1', [userId]);
    if (profileRes.rows.length > 0) {
        const profileId = profileRes.rows[0].id;
        // Delete wallet
        await client.query('DELETE FROM finance.wallets WHERE client_id = $1', [profileId]).catch(e => console.log('Wallet error:', e.message));
        
        // Delete address
        await client.query('DELETE FROM public.address WHERE profile_client_id = $1', [profileId]).catch(e => {});
    }

    await client.query('DELETE FROM client.profile WHERE user_id = $1', [userId]).catch(e => console.log(e.message));
    await client.query('DELETE FROM expert.profile WHERE user_id = $1', [userId]).catch(e => console.log(e.message));
    await client.query('DELETE FROM users WHERE id = $1', [userId]);
    console.log('User deleted successfully.');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

deleteUser();
