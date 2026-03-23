const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, '../../data');
const SCRIPTS_DIR = __dirname;
const NCCI_DIR = path.join(DATA_DIR, 'ncci');

const NCCI_URLS = [
  'https://www.cms.gov/files/zip/medicare-ncci-2025q1-practitioner-ptp-edits-ccipra-v310r0-f4.zip'
];

async function acquireNCCI() {
  console.log('⚖️  Starting NCCI Edits Acquisition (v3.0-PRO)...');

  if (!fs.existsSync(NCCI_DIR)) fs.mkdirSync(NCCI_DIR, { recursive: true });

  for (const url of NCCI_URLS) {
    try {
      const zipName = 'ncci_2025_q1.zip';
      const zipPath = path.join(DATA_DIR, zipName);
      
      if (!fs.existsSync(zipPath)) {
        console.log(`📥 Downloading ${zipName}...`);
        const ua = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
        execSync(`curl -L -A "${ua}" -o "${zipPath}" "${url}"`);
      }

      console.log(`📦 Unzipping ${zipName}...`);
      execSync(`unzip -o "${zipPath}" -d "${NCCI_DIR}"`);

      // 3. Find and import all .txt files in the ncci folder
      const ncciFiles = fs.readdirSync(NCCI_DIR);
      const targetTxt = ncciFiles.find(f => f.toLowerCase().endsWith('.txt') && f.includes('v3'));
      
      if (targetTxt) {
          console.log(`⚙️  Importing NCCI batch: ${targetTxt}...`);
          execSync(`node ${path.join(SCRIPTS_DIR, 'import_ncci_edits.js')} "${path.join(NCCI_DIR, targetTxt)}"`, { stdio: 'inherit' });
      } else {
          console.log('❌ No valid NCCI .txt file found after unzip.');
      }

    } catch (err) {
      console.error('❌ NCCI Process Failed:', err.message);
    }
  }

  console.log('✅ NCCI Sync Complete.');
}

acquireNCCI();
