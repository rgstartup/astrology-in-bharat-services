const { DataSource } = require("typeorm");

const AppDataSource = new DataSource({
    type: "postgres",
    url: process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/astrology_in_bharat", // Modify as needed
    // Assuming standard localhost credentials, but let's check .env
});

async function run() {
    require('dotenv').config();
    const dataSource = new DataSource({
        type: "postgres",
        url: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_URL?.includes('sslmode=require') ? { rejectUnauthorized: false } : false
    });
    
    await dataSource.initialize();
    console.log("Data Source has been initialized!");
    await dataSource.query(`ALTER TABLE "auth"."sessions" ALTER COLUMN "user_agent" TYPE text;`);
    console.log("Column user_agent altered successfully.");
    await dataSource.destroy();
}

run().catch(console.error);
