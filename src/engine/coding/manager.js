const { searchICD10, searchCPT, searchHCPCS } = require('../search');

/**
 * Coding Manager
 * Orchestrates the search for ICD-10, CPT, and HCPCS codes based on analyzed categories.
 */
async function determineCodes(clinicalAnalysis) {
  const codingResults = {
    icd10: [],
    cpt: [],
    hcpcs: []
  };

  // 1. Determine ICD-10 Codes (Diagnoses + Symptoms)
  const icdTerms = [...clinicalAnalysis.diagnoses, ...clinicalAnalysis.symptoms];
  for (const term of icdTerms) {
    const searchResults = await searchICD10(term);
    if (searchResults && searchResults.candidates.length > 0) {
      codingResults.icd10.push({
        finding: term,
        ...searchResults.candidates[0]
      });
    }
  }

  // 2. Determine CPT Codes (Procedures)
  for (const procedure of clinicalAnalysis.procedures) {
    const results = await searchCPT(procedure);
    if (results.length > 0) {
      codingResults.cpt.push(...results.map(r => ({ finding: procedure, ...r })));
    }
  }

  // 3. Determine HCPCS Codes (Supplies)
  for (const supply of clinicalAnalysis.supplies) {
    const results = await searchHCPCS(supply);
    if (results.length > 0) {
      codingResults.hcpcs.push(...results.map(r => ({ finding: supply, ...r })));
    }
  }

  return codingResults;
}

module.exports = {
  determineCodes
};
