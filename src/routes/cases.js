const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /cases - Read all cases
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM cases ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch cases' });
  }
});

// GET /cases/:id - Read a single case
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await db.query('SELECT * FROM cases WHERE id = $1', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Case not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch case' });
  }
});

// POST /cases - Create a new case
router.post('/', async (req, res) => {
  const { title, patient_ref, status, chief_complaint, clinical_notes, input_type, icd10_code, user_id } = req.body;
  try {
    const query = `
      INSERT INTO cases (title, patient_ref, status, chief_complaint, clinical_notes, input_type, icd10_code, user_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    const values = [title, patient_ref, status || 'draft', chief_complaint, clinical_notes, input_type || 'text', icd10_code, user_id];
    const { rows } = await db.query(query, values);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create case' });
  }
});

// PUT /cases/:id - Update an existing case
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { title, patient_ref, status, chief_complaint, clinical_notes, input_type, icd10_code } = req.body;
  try {
    const query = `
      UPDATE cases
      SET title = COALESCE($1, title),
          patient_ref = COALESCE($2, patient_ref),
          status = COALESCE($3, status),
          chief_complaint = COALESCE($4, chief_complaint),
          clinical_notes = COALESCE($5, clinical_notes),
          input_type = COALESCE($6, input_type),
          icd10_code = COALESCE($7, icd10_code)
      WHERE id = $8
      RETURNING *
    `;
    const values = [title, patient_ref, status, chief_complaint, clinical_notes, input_type, icd10_code, id];
    const { rows } = await db.query(query, values);
    if (rows.length === 0) return res.status(404).json({ error: 'Case not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update case' });
  }
});

module.exports = router;
