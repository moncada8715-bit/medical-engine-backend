/**
 * Output Module
 * Generates the final structured response and maps to claim formats.
 */
async function generateFinalOutput(clinicalAnalysis, codingResults, billingReport, auditReport) {
  return {
    engine_metadata: {
      version: '2.0.0-PRO',
      timestamp: new Date().toISOString()
    },
    clinical_analysis: clinicalAnalysis,
    coding_results: codingResults,
    billing_report: billingReport,
    audit_report: auditReport,
    cms_1500_mapping: {
      block_21_dx: billingReport.claim_draft.primary_diagnosis,
      block_24_procedures: billingReport.claim_draft.procedures.map(p => ({
        cpt: p.code,
        dx_pointer: '1'
      }))
    }
  };
}

module.exports = {
  generateFinalOutput
};
