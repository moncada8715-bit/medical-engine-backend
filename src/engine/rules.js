/**
 * Implements the Specificity Gate rule.
 * Tests checking for missing specificity/laterality assumptions.
 */
function applySpecificityGate(candidates, entities) {
  let needsQuery = false;
  
  if (entities.missing_specificity || entities.laterality === 'unspecified') {
    needsQuery = true;
  }

  // We do not assume specificity - if missing_specificity is true, 
  // we just flag query_provider_needed. We return candidates as is 
  // but let the validation phase pick 'unspecified' codes if available.
  return {
    gatedCandidates: candidates,
    needsQuery
  };
}

/**
 * Diagnosis vs Symptom Rule: Confirmed diagnosis overrides symptoms.
 * If there are both diagnosis codes and symptom codes, prefer diagnosis codes.
 */
function applyDiagnosisVsSymptomRule(candidates, entities) {
  // If we have candidates that matched confirmed_diagnoses, we keep only those (and drop symptoms)
  // unless there are NO confirmed candidates.
  const diagnosisCandidates = candidates.filter(c => c.is_diagnosis);
  const symptomCandidates = candidates.filter(c => c.is_symptom);

  if (diagnosisCandidates.length > 0) {
    return diagnosisCandidates;
  }
  
  return symptomCandidates;
}

/**
 * Apply Sequencing Rule to determine primary and secondary codes.
 */
function applySequencingRule(candidates, entities) {
  // Trivial sequencing: first in the list is primary, rest are secondary.
  if (!candidates || candidates.length === 0) return [];

  // Mark the first one as primary
  return candidates.map((c, idx) => ({
    ...c,
    is_primary: idx === 0
  }));
}

module.exports = {
  applySpecificityGate,
  applyDiagnosisVsSymptomRule,
  applySequencingRule
};
