const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const srcDir = path.join(__dirname, 'src');

function findSchemas(dir, schemas) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      findSchemas(fullPath, schemas);
    } else if (fullPath.endsWith('.ts')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const regex = /schema:\s*['"]([^'"]+)['"]/g;
      let match;
      while ((match = regex.exec(content)) !== null) {
        schemas.add(match[1]);
      }
    }
  }
}

(async () => {
  const schemas = new Set();
  findSchemas(srcDir, schemas);
  
  // Add some known ones just in case
  schemas.add('public');
  schemas.add('auth');
  schemas.add('users');
  
  console.log('Found schemas:', Array.from(schemas));

  const client = new Client('postgresql://neondb_owner:npg_a3hdzb7leXnF@ep-dark-snow-atxxy0vr-pooler.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require');
  await client.connect();
  
  for (const schema of schemas) {
    await client.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);
    console.log(`Created schema: ${schema}`);
  }
  await client.end();
})();
