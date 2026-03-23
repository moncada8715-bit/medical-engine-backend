const db = require('../db');

/**
 * Medical Necessity Module
 * Validates ICD-10 to CPT mapping against professional policy datasets.
 */
async function validateMedicalNecessity(codingResults) {
  const billingReport = {
    is_medically_necessary: true,
    necessity_rationale: "Analysis indicates procedures are supported by the primary diagnosis based on professional guidelines.",
    claim_draft: {
      primary_diagnosis: null,
      procedures: [],
      modifiers: []
    }
  };

  if (codingResults.icd10.length === 0) {
    billingReport.is_medically_necessary = false;
    billingReport.necessity_rationale = "No primary diagnosis identified to support medical necessity.";
    return billingReport;
  }

  const primaryDx = codingResults.icd10[0].code;
  billingReport.claim_draft.primary_diagnosis = primaryDx;

  try {
    // Check database for established policy links between assigned DX and CPT
    const cptCodes = codingResults.cpt.map(c => c.code);
    if (cptCodes.length > 0) {
      const query = `
        SELECT cpt_code, policy_reference 
        FROM icd10_cpt_mapping 
        WHERE icd10_code = $1 AND cpt_code = ANY($2)
      `;
      const { rows } = await db.query(query, [primaryDx, cptCodes]);
      const mappedCPTs = rows.map(r => r.cpt_code);

      codingResults.cpt.forEach(proc => {
        const isMapped = mappedCPTs.includes(proc.code);
        billingReport.claim_draft.procedures.push({
          code: proc.code,
          description: proc.description,
          linked_dx: primaryDx,
          policy_supported: isMapped
        });

        if (!isMapped) {
          billingReport.is_medically_necessary = false;
          billingReport.necessity_rationale = `Medical necessity flag: Procedure ${proc.code} is not explicitly mapped to Diagnosis ${primaryDx} in current policy dataset.`;
        }
      });
    }
  } catch (err) {
    console.error('Medical Necessity Error:', err);
  }

  return billingReport;
}

module.exports = {
  validateMedicalNecessity
};
