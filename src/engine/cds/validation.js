const db = require('../../db');

/**
 * Validation Layer (v1.1-CALIBRATED)
 * Validates CPT/ICD-10 coherence, NCCI PTP conflicts, and Clinical Sanity.
 */

async function validateCoding(cptCode, icd10Codes, clinicalNote = '') {
  const flags = [];
  let riskLevel = 'low';

  // 1. Clinical Category Sanity Check
  // Ensure the ICD-10 chapters align with the clinical context.
  const noteLower = clinicalNote.toLowerCase();
  
  for (const code of icd10Codes) {
      const chapter = code.substring(0, 1).toUpperCase();
      
      // Example: Infectious diseases (A-B) in a pure trauma case.
      if ((chapter === 'A' || chapter === 'B') && !noteLower.includes('infect') && !noteLower.includes('fever')) {
          flags.push({
              type: 'coherence',
              message: `Code ${code} (Infectious) seems unrelated to clinical documentation.`,
              severity: 'warning'
          });
          riskLevel = 'moderate';
      }

      // 2. ICD-10 Coherence (Medical Necessity mapping)
      // Strip periods for exact DB matching (e.g., R07.9 -> R079)
      const cleanCode = code.replace(/\./g, '');
      const { rows } = await db.pool.query(
        'SELECT * FROM icd10_cpt_mapping WHERE icd10_code = $1 AND cpt_code = $2',
        [cleanCode, cptCode]
      );
      
      if (rows.length === 0) {
        flags.push({
          type: 'necessity',
          message: `ICD-10 code ${code} has no documented LCD support for CPT ${cptCode}.`,
          severity: 'warning'
        });
        if (riskLevel !== 'high') riskLevel = 'moderate';
      }
  }

  // 3. NCCI PTP (Procedure-to-Procedure) Bundling
  // If we had multiple CPTs, we would check for bundling conflicts here.
  // For single CPT, we check if it is a "column 2" code that requires a modifier.
  const ncciCheck = await db.pool.query(
      'SELECT * FROM ncci_edits WHERE code_column_2 = $1 LIMIT 5',
      [cptCode]
  );
  if (ncciCheck.rows.length > 0) {
      flags.push({
          type: 'ncci_bundling',
          message: `CPT ${cptCode} is frequently bundled into primary procedures. Verify modifier usage.`,
          severity: 'info'
      });
  }

  // 4. Documentation Gaps
  if (icd10Codes.length === 0) {
    flags.push({
      type: 'missing_data',
      message: 'No supported ICD-10 codes detected for this encounter.',
      severity: 'critical'
    });
    riskLevel = 'high';
  }

  return {
    risk_level: riskLevel,
    compliance_flags: flags,
    timestamp: new Date().toISOString()
  };
}

module.exports = { validateCoding };

