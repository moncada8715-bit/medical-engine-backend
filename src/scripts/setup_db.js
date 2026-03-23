require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function setupDatabase() {
  if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes('PASTE_YOUR_SUPABASE_DATABASE_URL_HERE')) {
    console.error("Error: Please set your real DATABASE_URL in the .env file first.");
    process.exit(1);
  }

  const schemaPath = path.join(__dirname, '../../db/schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');

  console.log("Applying schema to the database...");
  try {
    const client = await pool.connect();
    await client.query(schemaSql);
    client.release();
    console.log("✅ Schema applied successfully! The database is now initialized.");
  } catch (err) {
    console.error("❌ Failed to apply schema:", err);
  } finally {
    await pool.end();
  }
}

setupDatabase();
