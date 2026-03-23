const { validateNCCI } = require('./ncci');

/**
 * Audit & Compliance Module
 * Detects risks and inconsistencies in the coding/billing data.
 */
async function performComplianceAudit(clinicalAnalysis, codingResults, billingReport) {
  const auditReport = {
    denial_risk: 'LOW',
    compliance_flags: [],
    inconsistencies: [],
    overcoding_suspected: false
  };

  // 1. NCCI Edit Check
  const ncciFlags = await validateNCCI(codingResults.cpt);
  if (ncciFlags.length > 0) {
    auditReport.compliance_flags.push(...ncciFlags.map(f => f.message));
    auditReport.denial_risk = 'HIGH';
  }

  // 2. Check for missing specificity
  if (clinicalAnalysis.guideline_warnings.length > 0) {
    auditReport.compliance_flags.push(...clinicalAnalysis.guideline_warnings);
    auditReport.denial_risk = 'MEDIUM';
  }

  // 2. Check for procedure without diagnosis (Billing Necessity)
  if (!billingReport.is_medically_necessary) {
    auditReport.denial_risk = 'HIGH';
    auditReport.inconsistencies.push(billingReport.necessity_rationale);
  }

  // 3. Logic: Check for duplicate coding
  const uniqueICDs = new Set(codingResults.icd10.map(i => i.code));
  if (uniqueICDs.size < codingResults.icd10.length) {
    auditReport.overcoding_suspected = true;
    auditReport.inconsistencies.push("Duplicate ICD-10 codes detected for the same clinical episode.");
  }

  return auditReport;
}

module.exports = {
  performComplianceAudit
};
