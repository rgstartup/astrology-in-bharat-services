import { Client } from 'pg';
import * as dotenv from 'dotenv';
import { join } from 'path';

dotenv.config({ path: join(__dirname, '../.env') });

const url = process.env.DATABASE_URL;

async function migratePujaAppointments() {
  const client = new Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to Database');

    // 1. Check if the table "puja_appointments" exists
    const checkTable = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'consultations' 
        AND table_name = 'puja_appointments'
      );
    `);

    if (!checkTable.rows[0].exists) {
      console.log('ℹ️ Table consultations.puja_appointments does not exist yet. No migration needed.');
      return;
    }

    // 2. Check columns in consultations.puja_appointments
    const columnsCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'consultations' 
      AND table_name = 'puja_appointments';
    `);

    const columns = columnsCheck.rows.map(r => r.column_name);
    console.log('Current columns in puja_appointments:', columns);

    const hasUserId = columns.includes('user_id');
    const hasClientId = columns.includes('client_id');

    if (hasUserId && !hasClientId) {
      console.log('Renaming column user_id to client_id in puja_appointments...');
      // Drop the old foreign key constraint if it exists first
      try {
        await client.query('ALTER TABLE consultations.puja_appointments DROP CONSTRAINT IF EXISTS "FK_user_id"');
        await client.query('ALTER TABLE consultations.puja_appointments DROP CONSTRAINT IF EXISTS "FK_7493a74a1d41829e2fa8a1e2f8d"');
        // Let's search if there are other FK constraints on user_id in that table
        const fkQuery = await client.query(`
          SELECT constraint_name 
          FROM information_schema.key_column_usage 
          WHERE table_schema = 'consultations' 
          AND table_name = 'puja_appointments' 
          AND column_name = 'user_id';
        `);
        for (const fkRow of fkQuery.rows) {
          console.log(`Dropping constraint: ${fkRow.constraint_name}`);
          await client.query(`ALTER TABLE consultations.puja_appointments DROP CONSTRAINT IF EXISTS "${fkRow.constraint_name}"`);
        }
      } catch (err) {
        console.warn('Could not drop constraints, proceeding with rename:', err);
      }
      
      await client.query('ALTER TABLE consultations.puja_appointments RENAME COLUMN user_id TO client_id;');
      console.log('Column user_id successfully renamed to client_id.');
    }

    // 3. Fetch all appointments using client_id
    const res = await client.query('SELECT id, client_id FROM consultations.puja_appointments');
    console.log(`Found ${res.rows.length} puja appointments.`);

    for (const row of res.rows) {
      const { id: apptId, client_id: oldId } = row;
      if (!oldId) continue;

      // Check if oldId is a valid client profile ID
      const profileCheck = await client.query('SELECT id FROM client.profile WHERE id = $1', [oldId]);
      if (profileCheck.rows.length > 0) {
        console.log(`Appt ${apptId}: client_id ${oldId} is already a valid client profile ID.`);
        continue;
      }

      // If not, treat oldId as a user_id and look up the corresponding client profile
      const findProfile = await client.query('SELECT id FROM client.profile WHERE user_id = $1', [oldId]);
      if (findProfile.rows.length > 0) {
        const newProfileId = findProfile.rows[0].id;
        console.log(`Appt ${apptId}: mapping user_id ${oldId} to client profile ID ${newProfileId}.`);
        await client.query('UPDATE consultations.puja_appointments SET client_id = $1 WHERE id = $2', [newProfileId, apptId]);
      } else {
        // If no client profile exists for that user_id, let's create one!
        // We first check if the user exists
        const userCheck = await client.query('SELECT id FROM public.users WHERE id = $1', [oldId]);
        if (userCheck.rows.length > 0) {
          console.log(`Appt ${apptId}: client profile for user_id ${oldId} does not exist. Creating one.`);
          const insertProfile = await client.query(
            'INSERT INTO client.profile (user_id, gender) VALUES ($1, $2) RETURNING id',
            [oldId, 'other']
          );
          const newProfileId = insertProfile.rows[0].id;
          console.log(`Appt ${apptId}: created client profile ID ${newProfileId} for user_id ${oldId}.`);
          await client.query('UPDATE consultations.puja_appointments SET client_id = $1 WHERE id = $2', [newProfileId, apptId]);
        } else {
          // If the user doesn't even exist, this is orphaned data. Let's delete it so foreign key won't fail.
          console.log(`Appt ${apptId}: user_id ${oldId} does not exist in users table. Deleting orphaned appointment.`);
          await client.query('DELETE FROM consultations.puja_appointments WHERE id = $1', [apptId]);
        }
      }
    }

    console.log('✅ Migration completed successfully.');

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await client.end();
  }
}

migratePujaAppointments();
