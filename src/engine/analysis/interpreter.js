/**
 * Clinical Analysis & Guideline Interpreter
 * This module interprets the extracted clinical facts and applies guideline-based reasoning.
 */
async function interpretClinicalFacts(facts) {
  const analysis = {
    diagnoses: facts.confirmed_diagnoses || [],
    symptoms: facts.symptoms || [],
    procedures: facts.procedures || [],
    supplies: facts.supplies || [],
    guideline_warnings: [],
    required_specificity: [],
    inferred_attributes: {}
  };

  // 1. Combine findings for a general "Key Findings" view
  analysis.key_findings = [
    ...analysis.diagnoses,
    ...analysis.symptoms,
    ...analysis.procedures
  ];

  // 2. Validate Specificity
  if (facts.laterality === 'unspecified' && facts.missing_specificity) {
    analysis.guideline_warnings.push("Laterality is missing or unspecified in the documentation.");
    analysis.required_specificity.push("laterality");
  }

  if (facts.encounter === 'unspecified') {
    analysis.guideline_warnings.push("Encounter type (initial, subsequent, sequela) is not clearly stated.");
    analysis.required_specificity.push("encounter_type");
  }

  // 3. Clinical Reasoning
  if (analysis.diagnoses.length > 0 && analysis.symptoms.length > 0) {
    analysis.inferred_attributes.priority_level = 'DIAGNOSIS_OVER_SYMPTOM';
  }

  return analysis;
}

module.exports = {
  interpretClinicalFacts
};
