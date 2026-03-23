const fs = require('fs');
const readline = require('readline');
const db = require('../db');

async function importHCPCS(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    process.exit(1);
  }

  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  console.log(`🚀 Starting high-performance HCPCS Level II import from: ${filePath}`);
  let count = 0;
  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');
    for await (const line of rl) {
      if (!line.trim()) continue;

      // Corrected HCPCS Offsets based on debug findings
      const code = line.substring(3, 8).trim(); 
      const shortDesc = line.substring(11, 40).trim();
      const longDesc = line.substring(41).trim();

      if (code && shortDesc) {
        await client.query(
          'INSERT INTO hcpcs_codes (code, short_description, long_description, category, effective_year) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (code) DO UPDATE SET short_description = $2, long_description = $3',
          [code, shortDesc, longDesc, 'Level II', 2025]
        );
        count++;
        if (count % 1000 === 0) console.log(`...processed ${count} HCPCS codes`);
      }
    }
    await client.query('COMMIT');
    client.release();
    console.log(`✅ Success: Imported ${count} HCPCS Level II codes.`);
    process.exit(0);
  } catch (err) {
    await client.query('ROLLBACK');
    client.release();
    console.error('❌ HCPCS Import failed:', err);
    process.exit(1);
  }
}

const pathArg = process.argv[2];
if (pathArg) importHCPCS(pathArg);
