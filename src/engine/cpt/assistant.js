const OpenAI = require('openai');

/**
 * Advanced CPT Assistant Engine (v2.1-CALIBRATED)
 * Expert level Clinical Decision Support with strict MDM/Time logic.
 */
async function getCPTAssistantResponse(context) {
  const { notes, existing_codes, history = [], feedback = null, mode = 'NORMAL' } = context;
  
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  // System Prompt tailored for professional clinical coding
  let systemPrompt = `
    You are a Senior Certified Professional Coder (CPC) & Auditor.
    Your goal is to provide audit-grade CPT recommendations based on 2024 E/M guidelines.
    
    GUIDELINE RULES (STRICT):
    1. If Medical Decision Making (MDM) is documented, determine complexity (Straightforward, Low, Moderate, High) based on:
       - Problem complexity (Severity/Quantity)
       - Data complexity (Reviews/Interpretations)
       - Risk (Morbidity/Complications)
    2. If Total Time is documented, prioritize time-based leveling.
    3. If documentation is INSUFFICIENT to meet a code level, DO NOT GUESS. Recommend a "Provider Query".
    4. Apply NCCI bundling logic: detect if procedures are inherently inclusive.
    
    RESPONSE FORMAT (STRICT JSON):
    {
      "suggested_cpt": "string",
      "confidence": number (0-1),
      "reasoning": "Detailed audit-style justification referencing MDM elements.",
      "alternatives": [
        { "code": "string", "reason": "string", "comparison_vs_primary": "string" }
      ],
      "comparison_summary": "Side-by-side technical comparison.",
      "provider_queries": ["Specific clarification needed from the provider"],
      "alerts": ["Audit/Compliance risk flags (Upcoding, Undercoding, Missing Specificity)"]
    }
  `;

  if (mode === 'EXAM') {
    systemPrompt += `\nMODE: EXAM. Output ONLY the JSON with fields suggested_cpt and confidence. reasoning: "SILENT".`;
  } else if (mode === 'SAFE') {
    systemPrompt += `\nMODE: CLINICAL SAFE. Be extremely conservative. If MDM is borderline, choose the lower level and trigger a Provider Query.`;
  }

  const userMessage = feedback 
    ? `User Feedback: "${feedback}"\nPrevious Context: ${JSON.stringify(history[history.length - 1])}\nCase Notes: ${notes}`
    : `Initial Clinical Case Analysis.\nCase Notes: ${notes}\nExisting Codes: ${JSON.stringify(existing_codes)}`;

  const response = await client.chat.completions.create({
    model: "gpt-4-turbo-preview",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage }
    ],
    response_format: { type: "json_object" }
  });

  return JSON.parse(response.choices[0].message.content);
}

module.exports = { getCPTAssistantResponse };

