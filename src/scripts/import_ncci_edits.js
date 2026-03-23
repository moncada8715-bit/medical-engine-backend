const fs = require('fs');
const readline = require('readline');
const db = require('../db');

/**
 * High-Performance NCCI PTP Edits Importer
 * Handles millions of records using heavy transaction batching.
 */
async function importNCCI(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    return;
  }

  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  console.log(`🚀 Starting ultra-fast NCCI PTP import from: ${filePath}`);
  let count = 0;
  const BATCH_SIZE = 5000;
  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    for await (const line of rl) {
      if (!line.trim() || line.startsWith('Column 1')) continue; // Skip header

      const cols = line.split('\t');
      if (cols.length >= 2) {
        const code1 = cols[0].trim();
        const code2 = cols[1].trim();
        const policy = cols[cols.length - 1]?.trim();

        await client.query(`
          INSERT INTO ncci_edits (code_column_1, code_column_2, policy_narrative, effective_year)
          VALUES ($1, $2, $3, $4)
        `, [code1, code2, policy, 2025]);

        count++;
        if (count % BATCH_SIZE === 0) {
            console.log(`...processed ${count} NCCI rules (Batch commit)`);
            await client.query('COMMIT');
            await client.query('BEGIN');
        }
      }
    }

    await client.query('COMMIT');
    client.release();
    console.log(`✅ Success: Imported ${count} official NCCI rules.`);
  } catch (err) {
    console.error('❌ NCCI Import failed:', err);
    await client.query('ROLLBACK');
    client.release();
  }
}

const pathArg = process.argv[2];
if (pathArg) importNCCI(pathArg);
