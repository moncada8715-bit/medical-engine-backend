const db = require('../db');

/**
 * Queries the existing `icd10_codes` table to find code candidates based on the extracted entities.
 * We rely strictly on the database and deterministic SQL matching (e.g. strict text search or ILIKE).
 */
async function searchICD10(entities) {
  const candidates = [];
  
  // Create a list of terms to search for
  const terms = [...entities.confirmed_diagnoses, ...entities.symptoms];
  
  if (terms.length === 0) {
    return candidates;
  }

  try {
    // We will do a basic ILIKE search for now to find relevant codes in the database.
    // In a production scenario, we could use PostgreSQL full-text search (to_tsvector/tsquery).
    // For each term, we try to find a match.
    for (const term of terms) {
      // Split term into keywords to match partially
      const keywords = term.split(' ').map(w => `%${w}%`);
      
      // Assume the table has `code` and `description` or `long_description`
      // Try to match the description.
      // We'll just do a simple match on the first keyword for simplicity, 
      // or match the exact term if it's broad.
      const query = `
        SELECT * FROM icd10_codes 
        WHERE description ILIKE $1
        LIMIT 5;
      `;
      const { rows } = await db.query(query, [`%${term}%`]);
      
      for (const row of rows) {
        candidates.push({
          code: row.code,
          description: row.description,
          term_matched: term,
          is_symptom: entities.symptoms.includes(term),
          is_diagnosis: entities.confirmed_diagnoses.includes(term)
        });
      }
    }

    // Deduplicate candidates
    const uniqueCandidates = [];
    const seenCodes = new Set();
    for (const c of candidates) {
      if (!seenCodes.has(c.code)) {
        seenCodes.add(c.code);
        uniqueCandidates.push(c);
      }
    }

    return uniqueCandidates;
  } catch (error) {
    console.error('Database Search Error:', error);
    // If table doesn't exist or query fails, return empty to let the engine handle the fallback.
    return [];
  }
}

module.exports = {
  searchICD10
};
