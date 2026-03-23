const db = require('./src/db');
async function check() {
  try {
    const hcpcs = await db.query('SELECT count(*) FROM hcpcs_codes');
    const icd10 = await db.query('SELECT count(*) FROM icd10_codes');
    console.log(`HCPCS Count: ${hcpcs.rows[0].count}`);
    console.log(`ICD-10 Count: ${icd10.rows[0].count}`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
check();
