const express = require('express');
const router = express.Router();
const { getCPTAssistantResponse } = require('../engine/cpt/assistant');

/**
 * POST /assistant/analyze
 * Initial or refined analysis for CPT Assistant.
 */
router.post('/analyze', async (req, res) => {
  try {
    const { notes, existing_codes, history, feedback, mode } = req.body;
    
    if (!notes) {
      return res.status(400).json({ error: "Medical notes are required." });
    }

    const result = await getCPTAssistantResponse({
      notes,
      existing_codes,
      history,
      feedback,
      mode
    });

    res.json(result);
  } catch (err) {
    console.error('CPT Assistant Route Error:', err);
    res.status(500).json({ error: "Failed to process CPT assistant request." });
  }
});

module.exports = router;
