const fs = require('fs');
const csv = require('csv-parser');
const db = require('../db');

/**
 * Official CPT Professional Importer
 * Designed for AMA's licensed data exports (typically structured CSV or DAT).
 */
async function importCPT(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    process.exit(1);
  }

  console.log(`🚀 Starting CPT Professional import from: ${filePath}`);
  let count = 0;

  fs.createReadStream(filePath)
    .pipe(csv())
    .on('data', async (row) => {
      const code = row.CPT_CODE || row.Code || row.CODE;
      const shortDesc = row.SHORT_DESCRIPTION || row.ShortDescription;
      const medDesc = row.MEDIUM_DESCRIPTION || row.MediumDescription;
      const longDesc = row.LONG_DESCRIPTION || row.LongDescription;
      const category = row.CATEGORY || row.Category;

      if (code && shortDesc) {
        try {
          await db.query(
            'INSERT INTO cpt_codes (code, short_description, medium_description, long_description, category, effective_year) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (code) DO NOTHING',
            [code, shortDesc, medDesc, longDesc, category, 2024]
          );
          count++;
        } catch (err) {
          console.error(`Error importing ${code}:`, err.message);
        }
      }
    })
    .on('end', () => {
      console.log(`✅ Success: Processed ${count} CPT Professional codes.`);
    });
}

const pathArg = process.argv[2];
if (!pathArg) {
  console.log('Usage: node src/scripts/import_cpt_official.js <path_to_cpt.csv>');
} else {
  importCPT(pathArg);
}
