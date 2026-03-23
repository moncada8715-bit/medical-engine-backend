require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function runAudit() {
  const report = {
    datasets: {},
    integrity: {},
    search_test: {},
    ncci: {},
    cpt: {},
    performance: {},
    timestamp: new Date().toISOString()
  };

  try {
    const client = await pool.connect();

    // 1. DATASETS STATUS
    const datasets = [
        { name: 'ICD-10-CM', table: 'icd10_codes', expected: 95000 },
        { name: 'HCPCS Level II', table: 'hcpcs_codes', expected: 7000 },
        { name: 'NCCI Edits', table: 'ncci_edits', expected: 1000000 },
        { name: 'CPT Codes', table: 'cpt_codes', expected: 10000 }
    ];

    for (const ds of datasets) {
        const { rows } = await client.query(`SELECT COUNT(*) FROM ${ds.table}`);
        const count = parseInt(rows[0].count);
        report.datasets[ds.name] = {
            dataset_name: ds.name,
            total_records_loaded: count,
            total_expected_records: ds.expected,
            completion_percentage: (count / ds.expected * 100).toFixed(2) + '%',
            loading_status: count >= ds.expected ? 'complete' : (count > 0 ? 'partial' : 'none')
        };
    }

    // 2. INTEGRITY CHECK
    const missingFields = await client.query(`
        SELECT COUNT(*) FROM icd10_codes WHERE description IS NULL OR description = ''
    `);
    const duplicates = await client.query(`
        SELECT COUNT(*) FROM (SELECT code FROM icd10_codes GROUP BY code HAVING COUNT(*) > 1) as dups
    `);
    
    report.integrity = {
        missing_fields_count: parseInt(missingFields.rows[0].count),
        duplicates_count: parseInt(duplicates.rows[0].count),
        invalid_records_count: 0 // Placeholder for deeper logic
    };

    // 3. SEARCH & RETRIEVAL TEST
    const queries = ['Hypertension', 'Chest pain', 'Diabetes'];
    report.search_test.results = [];
    let totalTime = 0;

    for (const q of queries) {
        const start = Date.now();
        const { rows } = await client.query(`
            SELECT code, description FROM icd10_codes 
            WHERE to_tsvector('english', description) @@ plainto_tsquery('english', $1)
            LIMIT 3
        `, [q]);
        const end = Date.now();
        totalTime += (end - start);
        report.search_test.results.push({ query: q, count: rows.length, samples: rows });
    }
    report.search_test.search_functional = report.search_test.results.every(r => r.count > 0);
    report.search_test.average_response_time = (totalTime / queries.length).toFixed(2) + 'ms';

    // 4. NCCI VALIDATION
    const ncciCount = await client.query('SELECT COUNT(*) FROM ncci_edits');
    report.ncci = {
        ncci_loaded: parseInt(ncciCount.rows[0].count) > 0,
        rules_count: parseInt(ncciCount.rows[0].count),
        sample_conflicts: (await client.query('SELECT code_column_1, code_column_2 FROM ncci_edits LIMIT 3')).rows
    };

    // 5. CPT STATUS
    const cptCount = parseInt(report.datasets['CPT Codes'].total_records_loaded);
    report.cpt = {
        cpt_available: cptCount > 0,
        source: cptCount > 0 ? "licensed (probable)" : "none"
    };

    // 6. PERFORMANCE CHECK
    report.performance = {
        avg_query_time_ms: report.search_test.average_response_time,
        system_status: parseFloat(report.search_test.average_response_time) < 200 ? 'optimal' : 'slow'
    };

    // 7. FINAL SYSTEM HEALTH
    report.system_ready = report.datasets['ICD-10-CM'].total_records_loaded > 0 && report.ncci.ncci_loaded;
    report.critical_issues = [];
    if (!report.ncci.ncci_loaded) report.critical_issues.push('NCCI Edits are missing or failed to load.');
    if (cptCount === 0) report.critical_issues.push('CPT dataset is empty. Engine using AI fallback.');

    console.log(JSON.stringify(report, null, 2));

    client.release();
  } catch (err) {
    console.error('Audit failed:', err);
  } finally {
    await pool.end();
  }
}

runAudit();
