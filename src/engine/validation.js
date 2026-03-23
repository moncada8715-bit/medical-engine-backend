/**
 * validateResult ensures the code actually matches DB descriptions, 
 * builds the expected output format.
 */
function validateResult(sequencedCodes, entities, needsQuery) {
  // Final format required:
  // {
  //   clinical_summary: string,
  //   suggestion_mode: { related_codes, relevant_section, guideline_hints },
  //   final_code_determination: { primary_code, primary_description, secondary_codes, justification, guideline_used, query_provider_needed },
  //   audit_flags: string[],
  //   academic_explanation: string
  // }

  const primaryCandidate = sequencedCodes.find(c => c.is_primary) || null;
  const secondaryCandidates = sequencedCodes.filter(c => !c.is_primary) || [];

  const final_code_determination = {
    primary_code: primaryCandidate ? primaryCandidate.code : 'None',
    primary_description: primaryCandidate ? primaryCandidate.description : 'No match found',
    secondary_codes: secondaryCandidates.map(c => c.code),
    justification: primaryCandidate ? `Matched based on clinical entity: ${primaryCandidate.term_matched}` : 'Insufficient clinical data',
    guideline_used: 'ICD-10-CM Official Guidelines for Coding and Reporting (Deterministic Match)',
    query_provider_needed: needsQuery || !primaryCandidate,
  };

  const suggestion_mode = {
    related_codes: sequencedCodes.map(c => c.code),
    relevant_section: primaryCandidate ? primaryCandidate.code.substring(0, 3) : 'Unknown',
    guideline_hints: [
      needsQuery ? 'Ensure laterality and specific site are documented.' : 'Code assigned based on highest specificity found.',
      'Always code to the highest degree of certainty.'
    ]
  };

  const audit_flags = [];
  if (needsQuery) audit_flags.push('Missing Specificity/Laterality');
  if (!primaryCandidate) audit_flags.push('No Codes Derived');
  if (entities.symptoms.length > 0 && final_code_determination.primary_code === 'None') audit_flags.push('Only symptoms provided without confirmed diagnosis');

  return {
    clinical_summary: entities.academic_explanation,
    suggestion_mode,
    final_code_determination,
    audit_flags,
    academic_explanation: entities.academic_explanation
  };
}

module.exports = {
  validateResult,
  buildOutput: validateResult // Using validateResult as the main build output logic
};
