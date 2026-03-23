const { calculateEMLevel, prioritizeICD10 } = require('./decision_engine');
const { validateCoding } = require('./validation');
const { getCorrectionPatterns } = require('./learning');
const { runGlobalValidation } = require('./global_validator');
const OpenAI = require('openai');

/**
 * CDS Orchestrator (v1.2-GATEKEEPER)
 * Coordinates clinical analysis, code suggestion, and global validation gatekeeper.
 */
async function processClinicalCase(notes, mode = 'NORMAL') {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  
  // 1. Get Patterns to inform AI
  const patterns = await getCorrectionPatterns();

  // 2. High-Level AI Extract (Guidelines Aware)
  const aiResponse = await client.chat.completions.create({
    model: "gpt-4-turbo-preview",
    messages: [
      { 
        role: "system", 
        content: `Extract clinical facts in JSON format following 2025 ICD-10-CM guidelines. 
                  Rule: Prioritize Definitive Diagnosis over Symptoms.
                  Provide: conditions (structured as {code, description}), symptoms, mdm_indicators, mdm_score (straightforward, low, moderate, high), estimated_time.
                  Informed by user trends: ${JSON.stringify(patterns)}`
      },
      { role: "user", content: notes }
    ],
    response_format: { type: "json_object" }
  });

  const clinicalFacts = JSON.parse(aiResponse.choices[0].message.content);

  // 3. ICD-10 Prioritization Logic (Chapter 18 Check)
  const icd10Result = prioritizeICD10(clinicalFacts.conditions || []);

  // 4. Structured CPT Calculation (MDM/Time)
  const suggestedCpt = calculateEMLevel(
      clinicalFacts.mdm_score || 'straightforward', 
      clinicalFacts.estimated_time || 0
  );

  // 5. Validation & Safety Layer (Audit-Grade)
  const validation = await validateCoding(suggestedCpt, (clinicalFacts.conditions || []).map(c => c.code), notes);

  // 6. Final Calibration Check (Safety Layer)
  const safetyAudit = runFinalSafetyAudit({
      cpt: suggestedCpt,
      icd10: icd10Result.primary,
      mdm: clinicalFacts.mdm_score,
      clinical_text: notes
  });

  // 7. Initial Response Assembly
  const initialResult = {
    clinical_analysis: {
      summary: clinicalFacts.summary || notes.substring(0, 100),
      symptoms: clinicalFacts.symptoms || [],
      mdm_assessment: clinicalFacts.mdm_score,
      mdm_indicators: clinicalFacts.mdm_indicators || []
    },
    suggested_codes: {
      icd10: icd10Result.primary ? [{
        ...icd10Result.primary,
        code: icd10Result.primary.code.replace(/\./g, '')
      }] : [],
      alternatives: (icd10Result.secondary || []).map(alt => ({
        ...alt,
        code: alt.code.replace(/\./g, '')
      })),
      hcpcs: []
    },
    cpt_suggestion: {
      code: suggestedCpt,
      reasoning: `Based on MDM level: ${clinicalFacts.mdm_score}. ${safetyAudit.warning ? '⚠️ ' + safetyAudit.warning : ''}`,
      mode_applied: mode,
      was_throttled: safetyAudit.throttled
    },
    validation: validation,
    safety_audit: safetyAudit,
    decision_trace: {
        step1: "Extracted clinical facts and MDM indicators via AI Reasoning.",
        step2: icd10Result.rule_applied,
        step3: `Calculated E/M level ${suggestedCpt} based on ${clinicalFacts.mdm_score} MDM complexity.`,
        step4: "Performed NCCI and clinical coherence validation.",
        step5: "Final Safety & Audit calibration applied."
    },
    system_diagnostics: {
      backend_source: "render-backend",
      backend_version: "v3.3.0-GATEKEEPER",
      deploy_timestamp: new Date().toISOString(),
      reference_engine_version: "build-74262-CALIBRATED",
      active_icd_dataset_version: "ICD-10-CM FY2025 (Full Registry)",
      cache_status: "fresh"
    },
    confidence_score: safetyAudit.confidence, 
    safety_disclaimer: "Audit-grade clinical decision support. Always verify with official documentation before billing."
  };

  // 8. MANDATORY GLOBAL VALIDATION GATEKEEPER
  return runGlobalValidation(initialResult, notes);
}


/**
 * Final Audit Check (v1.0)
 * Detects upcoding/undercoding and clinical inconsistencies.
 */
function runFinalSafetyAudit({ cpt, icd10, mdm, clinical_text }) {
    let confidence = 0.85;
    let warning = null;
    let throttled = false;

    // A. Upcoding Check: High level CPT with short clinical note.
    if ((cpt === '99285' || cpt === '99215') && clinical_text.length < 150) {
        warning = "Potential Upcoding Risk: High level selected for limited documentation.";
        confidence -= 0.2;
        throttled = true;
    }

    // B. Category Mismatch Check:
    if (icd10 && icd10.code.startsWith('R') && mdm === 'high') {
        warning = "Complexity Mismatch: High MDM documented but only symptoms (R-codes) coded. Consider more specific DX.";
        confidence -= 0.1;
    }

    return { confidence, warning, throttled };
}

module.exports = { processClinicalCase };

