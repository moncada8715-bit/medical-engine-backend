const db = require('../db');

/**
 * Audit & Compliance - NCCI Edits
 * Validates procedure combinations against National Correct Coding Initiative (NCCI) policies.
 */
async function validateNCCI(cptCodes) {
  const flags = [];
  if (cptCodes.length < 2) return flags;

  const codes = cptCodes.map(c => c.code);

  try {
    // Check for "Inseparable" or "Mutually Exclusive" pairings in our professional edits table
    const query = `
      SELECT code_column_1, code_column_2, policy_narrative 
      FROM ncci_edits 
      WHERE (code_column_1 = ANY($1) AND code_column_2 = ANY($1))
    `;
    const { rows } = await db.query(query, [codes]);

    rows.forEach(row => {
      flags.push({
        type: 'NCCI_EDIT',
        severity: 'HIGH',
        message: `Procedure combination ${row.code_column_1} and ${row.code_column_2} is restricted: ${row.policy_narrative}`
      });
    });
  } catch (err) {
    console.error('NCCI Validation Error:', err);
  }

  return flags;
}

module.exports = {
  validateNCCI
};
