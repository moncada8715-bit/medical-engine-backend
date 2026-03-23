const db = require('../../db');

/**
 * Learning System (v1.0-PRO)
 * Tracks user corrections and detects upcoding/downcoding trends.
 */

async function recordFeedback(caseId, originalSuggestion, userFinalData, reason) {
    const originalCpt = originalSuggestion.suggested_cpt;
    const finalCpt = userFinalData.final_cpt;
    
    let trend = 'neutral';
    if (originalCpt && finalCpt) {
        if (parseInt(finalCpt) > parseInt(originalCpt)) trend = 'upcoding';
        if (parseInt(finalCpt) < parseInt(originalCpt)) trend = 'downcoding';
    }

    const { rows } = await db.query(`
        INSERT INTO coding_feedback (original_suggestion, user_final_data, adjustment_reason, patterns)
        VALUES ($1, $2, $3, $4)
        RETURNING *
    `, [originalSuggestion, userFinalData, reason, { trend }]);

    return rows[0];
}

async function getCorrectionPatterns() {
    // Aggregates user behavior over time
    const { rows } = await db.query(`
        SELECT patterns->>'trend' as trend, count(*) 
        FROM coding_feedback 
        GROUP BY 1
    `);
    return rows;
}

module.exports = { recordFeedback, getCorrectionPatterns };
