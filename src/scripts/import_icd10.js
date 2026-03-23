require('dotenv').config();
const fs = require('fs');
const csv = require('csv-parser');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // Required for Supabase/hosted typical DBs. Change to false or remove if pure local PG without SSL.
});

async function importICD10Data(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  console.log(`Starting ICD-10 import from ${filePath}...`);
  
  const client = await pool.connect();
  let count = 0;

  try {
    await client.query('BEGIN');
    
    // We expect a CSV with column headers similar to: code,description,is_billable
    // Adjust headers based on your actual ICD-10 CSV file.
    return new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', async (row) => {
          try {
            // Trim and sanitize
            const code = row.code ? row.code.trim() : null;
            const description = row.description ? row.description.trim() : null;
            const isBillable = row.is_billable === 'true' || row.is_billable === '1';

            if (code && description) {
              const query = `
                INSERT INTO icd10_codes (code, description, is_billable)
                VALUES ($1, $2, $3)
                ON CONFLICT (code) DO UPDATE 
                SET description = EXCLUDED.description, is_billable = EXCLUDED.is_billable
              `;
              await client.query(query, [code, description, isBillable]);
              count++;
              // Print progress every 1000 rows
              if (count % 1000 === 0) console.log(`Inserted ${count} codes...`);
            }
          } catch (err) {
            console.error('Row insert error:', err.message, row);
          }
        })
        .on('end', async () => {
          console.log(`Committing ${count} codes to database...`);
          await client.query('COMMIT');
          client.release();
          console.log(`Import successful. Total codes: ${count}`);
          resolve();
        })
        .on('error', async (error) => {
          await client.query('ROLLBACK');
          client.release();
          reject(error);
        });
    });
  } catch (err) {
    await client.query('ROLLBACK');
    client.release();
    console.error('Transaction Failed:', err);
  }
}

// Expected execution: `node import_icd10.js ./icd10-dataset.csv`
const filePath = process.argv[2];
if (!filePath) {
  console.error("Usage: node src/scripts/import_icd10.js <path-to-csv>");
  process.exit(1);
}

importICD10Data(filePath)
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
