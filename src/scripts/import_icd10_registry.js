const fs = require('fs');
const db = require('../db');

async function importICD10Supersonic(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    process.exit(1);
  }

  console.log(`🚀 Starting SUPERSONIC ICD-10 import from: ${filePath}`);
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  let count = 0;
  const BATCH_SIZE = 5000; // 5000 rows * 2 params = 10,000 params (safe under 65k limit)
  let batch = [];
  const client = await db.pool.connect();

  try {
    for (const line of lines) {
        if (!line.trim()) continue;
        const code = line.substring(0, 7).trim();
        const description = line.substring(8).trim();

        if (code && description) {
            batch.push([code, description]);

            if (batch.length >= BATCH_SIZE) {
                await insertBatch(client, batch);
                count += batch.length;
                console.log(`...processed ${count} codes (Aggressive Batch)`);
                batch = [];
            }
        }
    }

    if (batch.length > 0) {
        await insertBatch(client, batch);
        count += batch.length;
    }

    client.release();
    console.log(`✅ Success: Imported ${count} ICD-10-CM codes.`);
    process.exit(0);
  } catch (err) {
    if (client) client.release();
    console.error('❌ Supersonic Import failed:', err);
    process.exit(1);
  }
}

async function insertBatch(client, batch) {
    const values = [];
    const placeholders = [];
    batch.forEach((row, i) => {
        const offset = i * 2;
        placeholders.push(`($${offset + 1}, $${offset + 2})`);
        values.push(row[0], row[1]);
    });

    const query = `
        INSERT INTO icd10_codes (code, description)
        VALUES ${placeholders.join(', ')}
        ON CONFLICT (code) DO NOTHING
    `;
    await client.query(query, values);
}

const pathArg = process.argv[2];
if (pathArg) importICD10Supersonic(pathArg);
