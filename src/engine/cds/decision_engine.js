/**
 * E/M Decision Engine (v1.1-CALIBRATED)
 * Implements 2024 E/M Leveling logic based on MDM (3-Elements) and Time.
 */

const EM_LEVELS = {
  NEW_PATIENT: {
    '99202': { level: 2, mdm: 'straightforward', time: 20 },
    '99203': { level: 3, mdm: 'low', time: 30 },
    '99204': { level: 4, mdm: 'moderate', time: 45 },
    '99205': { level: 5, mdm: 'high', time: 60 }
  },
  ESTABLISHED_PATIENT: {
    '99212': { level: 2, mdm: 'straightforward', time: 10 },
    '99213': { level: 3, mdm: 'low', time: 20 },
    '99214': { level: 4, mdm: 'moderate', time: 30 },
    '99215': { level: 5, mdm: 'high', time: 40 }
  },
  EMERGENCY: {
    '99282': { level: 2, mdm: 'straightforward' },
    '99283': { level: 3, mdm: 'low' },
    '99284': { level: 4, mdm: 'moderate' },
    '99285': { level: 5, mdm: 'high' }
  }
};

/**
 * Prioritizes codes based on Official ICD-10-CM Guidelines.
 * Rule: Prioritize Definitive Diagnosis over Symptoms (Chapter 18 R-codes).
 */
function prioritizeICD10(codes) {
    if (!codes || codes.length === 0) return [];

    const symptoms = codes.filter(c => c.code.startsWith('R'));
    const diagnosis = codes.filter(c => !c.code.startsWith('R'));

    // If a definitive diagnosis exists, it ranks higher than symptoms.
    // However, we return both for the assistant's context, but mark the primary.
    if (diagnosis.length > 0) {
        return {
            primary: diagnosis[0],
            secondary: symptoms,
            rule_applied: "Official Guideline: Prioritize definitive diagnosis over symptoms (R-codes)."
        };
    }

    return {
        primary: symptoms[0] || codes[0],
        secondary: codes.slice(1),
        rule_applied: symptoms.length > 0 ? "Symptom coding applied due to lack of definitive diagnosis." : "Direct mapping applied."
    };
}

/**
 * Calculates E/M Level based on MDM components.
 * Calibrated for 2024 CMS thresholds.
 */
function calculateEMLevel(mdmScore, timeMinutes = 0, patientType = 'EMERGENCY') {
    const registry = EM_LEVELS[patientType] || EM_LEVELS.EMERGENCY;
    
    let bestCode = null;
    const scoreVal = mdmScore.toLowerCase();
    
    for (const [code, criteria] of Object.entries(registry)) {
        let match = false;
        
        // Match by MDM (Requires meeting or exceeding criteria)
        if (criteria.mdm === scoreVal) match = true;
        
        // Match by Time (Meeting the threshold)
        if (criteria.time && timeMinutes >= criteria.time) match = true;
        
        if (match) {
            if (!bestCode || criteria.level > registry[bestCode].level) {
                bestCode = code;
            }
        }
    }
    
    return bestCode || Object.keys(registry)[0];
}

module.exports = { calculateEMLevel, EM_LEVELS, prioritizeICD10 };

