const { Client } = require('pg');
const client = new Client({
    connectionString: "postgresql://postgres:rH%2F%238m7ngwc.iLn@db.qooqffzykahvvoszaivj.supabase.co:5432/postgres",
    ssl: { rejectUnauthorized: false }
});
console.log('Connecting...');
client.connect()
    .then(() => {
        console.log('Connected. Querying schema...');
        return client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'disputes'");
    })
    .then(res => {
        if (res.rows.length === 0) {
            console.log('TABLE NOT FOUND!');
        } else {
            console.log('Columns:', res.rows);
        }
        client.end();
    })
    .catch(e => {
        console.error('ERROR:', e.message);
        client.end();
    });
