const db = require('../db');

/**
 * Unified Search Module (v3.0-PRO)
 * Supports hierarchical traversal and multi-year version filtering.
 */

async function searchICD10(term, year = 2024) {
  if (!term) return { candidates: [] };
  const keywords = term.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(' ').filter(k => k.length > 2);
  if (keywords.length === 0) return { candidates: [] };

  try {
    const ilikeClauses = keywords.map((_, i) => `description ILIKE $${i + 3}`).join(' OR ');
    
    // Updated query to filter by active status and year, and support hierarchical ranking
    const query = `
      SELECT code, description, parent_code, is_billable
      FROM icd10_codes 
      WHERE status = 'active' AND effective_year = $1 AND (${ilikeClauses} OR code ILIKE $2)
      ORDER BY (
        ${keywords.map((_, i) => `(CASE WHEN description ILIKE $${i + 3} THEN 2 ELSE 0 END)`).join(' + ')} +
        (CASE WHEN code ILIKE $2 THEN 5 ELSE 0 END)
      ) DESC
      LIMIT 12;
    `;
    const { rows } = await db.query(query, [year, `%${term}%`, ...keywords.map(k => `%${k}%`)]);
    
    return { 
      candidates: rows.map(r => ({ 
        code: r.code, 
        description: r.description, 
        parent: r.parent_code,
        billable: r.is_billable,
        type: 'ICD-10' 
      })) 
    };
  } catch (err) {
    console.error('ICD-10 Hierarchical Search Error:', err);
    return { candidates: [] };
  }
}

async function searchCPT(term, year = 2024) {
  if (!term) return [];
  const keywords = term.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(' ').filter(k => k.length > 2);
  if (keywords.length === 0) return [];

  try {
    const clauses = keywords.map((_, i) => `(short_description ILIKE $${i + 3} OR long_description ILIKE $${i + 3})`).join(' OR ');
    const query = `
      SELECT code, short_description as description, category 
      FROM cpt_codes 
      WHERE status = 'active' AND effective_year = $1 AND (${clauses} OR code ILIKE $2)
      ORDER BY (
        ${keywords.map((_, i) => `(CASE WHEN short_description ILIKE $${i + 3} OR long_description ILIKE $${i + 3} THEN 1 ELSE 0 END)`).join(' + ')} +
        (CASE WHEN code ILIKE $2 THEN 5 ELSE 0 END)
      ) DESC
      LIMIT 5;
    `;
    const { rows } = await db.query(query, [year, `%${term}%`, ...keywords.map(k => `%${k}%`)]);
    return rows.map(r => ({ ...r, type: 'CPT' }));
  } catch (err) {
    console.error('CPT Professional Search Error:', err);
    return [];
  }
}

async function searchHCPCS(term, year = 2024) {
  if (!term) return [];
  const keywords = term.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(' ').filter(k => k.length > 2);
  if (keywords.length === 0) return [];

  try {
    const clauses = keywords.map((_, i) => `(short_description ILIKE $${i + 3} OR long_description ILIKE $${i + 3})`).join(' OR ');
    const query = `
      SELECT code, short_description as description, category 
      FROM hcpcs_codes 
      WHERE status = 'active' AND effective_year = $1 AND (${clauses} OR code ILIKE $2)
      ORDER BY (
        ${keywords.map((_, i) => `(CASE WHEN short_description ILIKE $${i + 3} OR long_description ILIKE $${i + 3} THEN 1 ELSE 0 END)`).join(' + ')} +
        (CASE WHEN code ILIKE $2 THEN 5 ELSE 0 END)
      ) DESC
      LIMIT 5;
    `;
    const { rows } = await db.query(query, [year, `%${term}%`, ...keywords.map(k => `%${k}%`)]);
    return rows.map(r => ({ ...r, type: 'HCPCS' }));
  } catch (err) {
    console.error('HCPCS Professional Search Error:', err);
    return [];
  }
}

module.exports = {
  searchICD10,
  searchCPT,
  searchHCPCS
};
