const OpenAI = require('openai');

/**
 * Academic Engine (v1.0)
 * Generates Professional Auditing and Exam Strategy insights.
 */
async function generateAcademicInsights(caseData, analysis) {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const prompt = `
    Analyze this clinical case and coding suggestion from an ACADEMIC perspective.
    
    CASE DATA: ${caseData.clinical_note}
    CODING: ${JSON.stringify(analysis.suggested_codes)}
    CPT: ${analysis.cpt_suggestion?.code}

    1. PROFESSIONAL EXPLANATION:
       - Explain the logic for ICD-10 and CPT selection.
       - Cite official ICD-10-CM/NCCI guidelines.
       - Mention Documentation gaps or Provider Query ops.

    2. EXAM MODE (CPC Strategy):
       - STEP 1 (Key Terms): List keywords path.
       - STEP 2 (Book Path): Index -> Tabular navigation.
       - STEP 3 (Elimination): Why other similar codes are wrong.
       - STEP 4 (Time Strategy): How to solve in <1 min.
       - STEP 5 (Final Answer): Summary.

    Respond ONLY in JSON format:
    {
      "professional": { "rationale": "", "guidelines": [], "audit_tips": [] },
      "exam_mode": { "step1_terms": [], "step2_path": "", "step3_elimination": "", "step4_time": "", "step5_final": "" },
      "assistant_context": "Summary for chat bot"
    }
    `;

    const response = await openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [{ role: "system", content: "You are a lead Medical Coding Educator (CPC/CCS Instructor)." }, { role: "user", content: prompt }],
        response_format: { type: "json_object" }
    });

    return JSON.parse(response.choices[0].message.content);
}

async function generateSimulation(originalQuery) {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const prompt = `Generate a NEW clinical scenario similar to "${originalQuery}" but with 1 key clinical difference that changes the code level. Provide the new clinical note only.`;

    const response = await openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [{ role: "user", content: prompt }]
    });

    return { clinical_note: response.choices[0].message.content };
}

module.exports = { generateAcademicInsights, generateSimulation };
