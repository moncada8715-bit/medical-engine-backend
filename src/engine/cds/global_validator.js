/**
 * Global Validation Layer (v1.0-GATEKEEPER)
 * Acts as a mandatory consistency and safety guard before final output.
 */

function runGlobalValidation(result, clinicalNote = '') {
    const summary = {
        passed: [],
        failed: [],
        blocked_codes: [],
        fallback_applied: false
    };

    let finalCpt = result.cpt_suggestion.code;
    let finalIcd10 = result.suggested_codes.icd10;
    const mdm = result.clinical_analysis.mdm_assessment;

    // 1. Documentation Sufficiency Check
    const noteLength = clinicalNote.trim().length;
    if (noteLength < 50) {
        summary.failed.push("Critical Documentation Insufficiency: Note too short for definitive coding.");
        summary.blocked_codes.push(finalCpt);
        summary.blocked_codes.push(...finalIcd10.map(c => c.code));
        finalCpt = "PROVIDER_QUERY_REQUIRED";
        finalIcd10 = [];
        summary.fallback_applied = true;
        return finalize(result, finalCpt, finalIcd10, summary);
    } else {
        summary.passed.push("Documentation volume meets minimum threshold.");
    }

    // 2. ICD-10 Domain Relevance Check (Chapter Consistency)
    const noteLower = clinicalNote.toLowerCase();
    const validatedIcd10 = finalIcd10.filter(item => {
        const code = item.code;
        const chapter = code.substring(0, 1).toUpperCase();
        
        // Safety: If code is for a specific organ system but note doesn't mention it.
        // Example: J-codes (Respiratory) vs G-codes (Nervous). 
        // This is a heuristic, but powerful for blocking hallucinations.
        if (chapter === 'J' && !noteLower.includes('breath') && !noteLower.includes('cough') && !noteLower.includes('lung') && !noteLower.includes('chest')) {
            summary.failed.push(`ICD-10 Domain Mismatch: Code ${code} (Respiratory) lacks supporting clinical narrative.`);
            summary.blocked_codes.push(code);
            return false;
        }
        return true;
    });
    
    if (validatedIcd10.length !== finalIcd10.length) {
        finalIcd10 = validatedIcd10;
        summary.fallback_applied = true;
    } else {
        summary.passed.push("ICD-10 clinical domain relevance verified.");
    }

    // 3. E/M Level & MDM Alignment (Balance Check)
    const levelDigit = finalCpt.slice(-1);
    const emLevel = parseInt(levelDigit); 
    const mdmLevels = { 'straightforward': 2, 'low': 3, 'moderate': 4, 'high': 5 };
    const requiredMdm = mdmLevels[mdm] || 2;

    if (!isNaN(emLevel) && emLevel > requiredMdm) {
        summary.failed.push(`E/M Balance Violation: Selected level 9928${emLevel} exceeds MDM complexity (${mdm}).`);
        summary.blocked_codes.push(finalCpt);
        // Force Downgrade
        const downgradedLevel = `9928${requiredMdm}`;
        summary.failed.push(`Action: Automatic downgrade to ${downgradedLevel} to maintain compliance.`);
        finalCpt = downgradedLevel;
        summary.fallback_applied = true;
    } else {
        summary.passed.push("E/M level matches documented MDM complexity.");
    }

    // 4. Compliance Consistency (No contradictions)
    if (finalIcd10.length === 0 && finalCpt !== "PROVIDER_QUERY_REQUIRED") {
        summary.failed.push("Compliance Conflict: CPT suggested without valid supporting ICD-10.");
        finalCpt = "PROVIDER_QUERY_REQUIRED";
        summary.fallback_applied = true;
    }

    return finalize(result, finalCpt, finalIcd10, summary);
}

function finalize(result, cpt, icd10, summary) {
    return {
        ...result,
        suggested_codes: {
            ...result.suggested_codes,
            icd10: icd10
        },
        cpt_suggestion: {
            ...result.cpt_suggestion,
            code: cpt,
            reasoning: summary.fallback_applied ? "Adjusted by Global Validation Layer." : result.cpt_suggestion.reasoning
        },
        validation_summary: summary,
        final_decision_status: summary.fallback_applied ? "auto_corrected" : "validated"
    };
}

module.exports = { runGlobalValidation };
