const { Client } = require('pg');

async function deleteUser() {
  const client = new Client({
    connectionString: 'postgresql://neondb_owner:npg_a3hdzb7leXnF@ep-dark-snow-atxxy0vr-pooler.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require',
  });

  await client.connect();
  console.log('Connected to DB...');

  // First find correct schemas
  const schemaRes = await client.query(`
    SELECT table_schema, table_name 
    FROM information_schema.tables 
    WHERE table_name IN ('sessions','oauth_accounts','used_tokens','profiles')
    ORDER BY table_schema, table_name
  `);
  console.log('Tables found:', schemaRes.rows);

  const email = 'r37577144@gmail.com';

  const userRes = await client.query(`SELECT id, email, name FROM public.users WHERE email = $1`, [email]);
  if (userRes.rows.length === 0) {
    console.log('❌ User not found:', email);
    await client.end();
    return;
  }
  const userId = userRes.rows[0].id;
  console.log('✅ User found, ID:', userId);

  try {
    // Delete sessions (find correct schema)
    for (const row of schemaRes.rows) {
      if (row.table_name === 'sessions') {
        const r = await client.query(`DELETE FROM "${row.table_schema}".sessions WHERE user_id = $1`, [userId]);
        console.log(`Deleted ${r.rowCount} sessions from ${row.table_schema}.sessions`);
      }
      if (row.table_name === 'oauth_accounts') {
        const r = await client.query(`DELETE FROM "${row.table_schema}".oauth_accounts WHERE user_id = $1`, [userId]);
        console.log(`Deleted ${r.rowCount} oauth_accounts from ${row.table_schema}.oauth_accounts`);
      }
      if (row.table_name === 'used_tokens') {
        const r = await client.query(`DELETE FROM "${row.table_schema}".used_tokens WHERE user_id = $1`, [userId]);
        console.log(`Deleted ${r.rowCount} used_tokens`);
      }
    }

    // Delete merchant profile
    const m = await client.query(`DELETE FROM merchant.profile WHERE user_id = $1`, [userId]).catch(e => { console.log('merchant profile:', e.message); return { rowCount: 0 }; });
    console.log(`Deleted ${m.rowCount} merchant profile`);

    // Delete expert profile
    const e = await client.query(`DELETE FROM expert.profile WHERE user_id = $1`, [userId]).catch(e => { console.log('expert profile:', e.message); return { rowCount: 0 }; });
    console.log(`Deleted ${e.rowCount} expert profile`);

    // Delete client profile (check both possible table names)
    const cp = await client.query(`SELECT id FROM client.profile WHERE user_id = $1`, [userId]).catch(() => ({ rows: [] }));
    if (cp.rows.length > 0) {
      await client.query(`DELETE FROM public.addresses WHERE profile_client_id = $1`, [cp.rows[0].id]).catch(() => {});
      await client.query(`DELETE FROM client.profile WHERE user_id = $1`, [userId]).catch(() => {});
      console.log('Deleted client profile');
    }

    // Delete user
    const u = await client.query(`DELETE FROM public.users WHERE id = $1`, [userId]);
    console.log(`✅ Deleted ${u.rowCount} user`);
    console.log('\n🎉 User', email, 'successfully deleted! Ab fresh test kar sakte ho.');
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await client.end();
  }
}

deleteUser();
