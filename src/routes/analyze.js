const express = require('express');
const router = express.Router();

const { processClinicalCase } = require('../engine/cds/orchestrator');

/**
 * POST /analyze-case
 * The professional Medical Coding Decision Support (CDS) entry point.
 */
router.post('/', async (req, res) => {
  const { clinical_note, case_id, mode = 'NORMAL' } = req.body;

  if (!clinical_note) {
    return res.status(400).json({ error: 'clinical_note is required' });
  }

  try {
    const cdsResponse = await processClinicalCase(clinical_note, mode);
    
    // Add case metadata if provided
    if (case_id) {
       cdsResponse.case_id = case_id;
    }

    res.json(cdsResponse);
  } catch (err) {
    console.error('CDS Engine Error:', err);
    res.status(500).json({ 
      error: 'Clinical Decision Support Engine failure', 
      details: err.message 
    });
  }
});

module.exports = router;
