const { OpenAI } = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Uses OpenAI to extract structured clinical entities from the clinical note.
 * Does NOT generate ICD codes, only extracts facts to be fed into the deterministic engine.
 */
async function extractClinicalEntities(note) {
  const prompt = `
    You are an expert clinical documentation specialist. 
    Analyze the following clinical note and extract the core clinical entities. 
    Do NOT suggest ICD-10 codes. Only extract the facts based on the text provided.
    
    Structure your response as a JSON object with the following schema:
    {
      "confirmed_diagnoses": ["string"],
      "symptoms": ["string"],
      "laterality": ["left", "right", "bilateral", "unspecified", "N/A"],
      "encounter": "initial" | "subsequent" | "sequela" | "unspecified",
      "missing_specificity": boolean,
      "academic_explanation": "brief clinical summary highlighting what was extracted and why"
    }

    Clinical Note:
    "${note}"
  `;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o', // Assuming access to gpt-4o, adjust to gpt-3.5-turbo or gpt-4 as needed
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.0,
    });

    const parsedResponse = JSON.parse(response.choices[0].message.content);
    return {
      confirmed_diagnoses: parsedResponse.confirmed_diagnoses || [],
      symptoms: parsedResponse.symptoms || [],
      laterality: parsedResponse.laterality || 'unspecified',
      encounter: parsedResponse.encounter || 'unspecified',
      missing_specificity: typeof parsedResponse.missing_specificity === 'boolean' ? parsedResponse.missing_specificity : false,
      academic_explanation: parsedResponse.academic_explanation || 'No explanation provided.'
    };
  } catch (error) {
    console.error('Extraction Error:', error);
    throw new Error('Failed to extract clinical entities from note.');
  }
}

module.exports = {
  extractClinicalEntities
};
