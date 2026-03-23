const express = require('express');
const router = express.Router();

const { extractClinicalEntities } = require('../engine/extraction');
const { searchICD10 } = require('../engine/search');
const { applySpecificityGate, applyDiagnosisVsSymptomRule, applySequencingRule } = require('../engine/rules');
const { validateResult, buildOutput } = require('../engine/validation');

// POST /analyze-case - Run the deterministic coding engine
router.post('/', async (req, res) => {
  const { title, clinical_note, input_type } = req.body;

  if (!clinical_note) {
    return res.status(400).json({ error: 'clinical_note is required' });
  }

  try {
    // 1. Extract Clinical Entities using OpenAI
    const entities = await extractClinicalEntities(clinical_note);

    // 2. Search ICD-10 database for candidates
    const candidates = await searchICD10(entities);

    // 3. Apply diagnosis vs symptom rule (confirmed diagnosis overrides symptoms)
    const filteredCandidates = applyDiagnosisVsSymptomRule(candidates, entities);

    // 4. Apply specificity gate (check for laterality/site missing specificity)
    const { gatedCandidates, needsQuery } = applySpecificityGate(filteredCandidates, entities);

    // 5. Sequence the primary and secondary codes
    const sequencedCodes = applySequencingRule(gatedCandidates, entities);

    // 6 & 7. Validate and Build definitive output
    const output = validateResult(sequencedCodes, entities, needsQuery);

    res.json(output);

  } catch (err) {
    console.error('Error during case analysis:', err);
    res.status(500).json({ error: 'Failed to analyze case', details: err.message });
  }
});

module.exports = router;
