const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function fixRoles() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to DB');

    // Get roles
    const rolesRes = await client.query('SELECT * FROM roles');
    const roles = rolesRes.rows;
    console.log('Available Roles:', roles);

    const adminRole = roles.find(r => r.name === 'admin');
    const expertRole = roles.find(r => r.name === 'expert');
    const clientRole = roles.find(r => r.name === 'client');
    const agentRole = roles.find(r => r.name === 'agent');

    // Get all users
    const usersRes = await client.query('SELECT * FROM users');
    const users = usersRes.rows;

    for (const user of users) {
      console.log(`Processing user: ${user.email}`);

      // Check if user already has a role
      const roleCheck = await client.query('SELECT * FROM user_roles WHERE user_id = $1', [user.id]);
      if (roleCheck.rowCount > 0) {
        console.log(`User ${user.email} already has ${roleCheck.rowCount} roles. Skipping.`);
        continue;
      }

      let roleToAssign = clientRole;

      if (user.email === 'admin@gmail.com') {
        roleToAssign = adminRole;
      } else {
        // Check for expert profile
        const expertProfile = await client.query('SELECT * FROM profile_experts WHERE user_id = $1', [user.id]);
        if (expertProfile.rowCount > 0) {
          roleToAssign = expertRole;
        } else {
          // Check for agent profile
          const agentProfile = await client.query('SELECT * FROM agent_profiles WHERE user_id = $1', [user.id]);
          if (agentProfile.rowCount > 0) {
            roleToAssign = agentRole;
          } else {
            // Check for merchant profile
            const merchantProfile = await client.query('SELECT * FROM profile_merchants WHERE user_id = $1', [user.id]);
            if (merchantProfile.rowCount > 0) {
              // Note: If merchant role doesn't exist, we fallback to client
              const merchantRole = roles.find(r => r.name === 'merchant');
              roleToAssign = merchantRole || clientRole;
            }
          }
        }
      }

      if (roleToAssign) {
        await client.query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)', [user.id, roleToAssign.id]);
        console.log(`Assigned role ${roleToAssign.name} to ${user.email}`);
      }
    }

  } catch (err) {
    console.error('Error fixing roles:', err);
  } finally {
    await client.end();
  }
}

fixRoles();
