const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * Professional Data Acquisition Orchestrator (v3.0)
 * Automates the Download -> Extract -> Import lifecycle for medical registries.
 */

const DATA_DIR = path.join(__dirname, '../../data');
const SCRIPTS_DIR = __dirname;

const DATASETS = [
  {
    name: 'ICD-10-CM 2025',
    url: 'https://www.cms.gov/files/zip/2025-code-descriptions-tabular-order.zip',
    zipName: 'icd10cm-2025.zip',
    targetFile: 'icd10cm_codes_2025.txt',
    importer: 'import_icd10_registry.js'
  },
  {
      name: 'HCPCS 2025',
      url: 'https://www.cms.gov/files/zip/january-2025-alpha-numeric-hcpcs-file.zip',
      zipName: 'hcpcs-2025.zip',
      targetFile: 'HCPC2025_JAN_ANWEB_12172024.txt',
      importer: 'import_hcpcs_official.js'
  }
];

async function acquire() {
  console.log('🏥 Starting Professional Medical Data Acquisition (v3.0)...');

  if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  for (const ds of DATASETS) {
    console.log(`\n--- Processing: ${ds.name} ---`);
    
    try {
      const zipPath = path.join(DATA_DIR, ds.zipName);
      
      // 1. Download (Skip if already exists and size > 100k, to save time/bandwidth)
      if (!fs.existsSync(zipPath) || fs.statSync(zipPath).size < 100000) {
        console.log(`📥 Downloading from ${ds.url}...`);
        const ua = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
        execSync(`curl -L -A "${ua}" -o "${zipPath}" "${ds.url}"`);
      } else {
        console.log(`⏩ ZIP already exists: ${ds.zipName}`);
      }

      // 2. Extract
      console.log(`📦 Unzipping ${ds.zipName}...`);
      execSync(`unzip -o "${zipPath}" -d "${DATA_DIR}"`);

      // 3. Find target file
      let actualFile = path.join(DATA_DIR, ds.targetFile);
      if (!fs.existsSync(actualFile)) {
          const files = fs.readdirSync(DATA_DIR);
          const match = files.find(f => 
            (ds.importer.includes('icd10') && f.toLowerCase().endsWith('.txt') && f.toLowerCase().includes('codes') && !f.includes('addenda')) ||
            (ds.importer.includes('hcpcs') && f.toLowerCase().endsWith('.txt') && f.toLowerCase().includes('anweb'))
          );
          if (match) actualFile = path.join(DATA_DIR, match);
      }

      // 4. Import
      if (fs.existsSync(actualFile)) {
        console.log(`⚙️  Running professional importer: ${ds.importer} on ${path.basename(actualFile)}...`);
        execSync(`node ${path.join(SCRIPTS_DIR, ds.importer)} "${actualFile}"`, { stdio: 'inherit' });
      } else {
        console.log(`❌ No suitable file found for ${ds.name} in ${DATA_DIR}.`);
      }

    } catch (err) {
      console.error(`❌ Failed to process ${ds.name}:`, err.message);
    }
  }

  console.log('\n✅ Data Acquisition Cycle Finished.');
}

acquire();
