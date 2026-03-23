const express = require('express');
const router = express.Router();
const { generateAcademicInsights, generateSimulation } = require('../engine/academic/generator');
const OpenAI = require('openai');

/**
 * POST /academic/analyze
 * Generates the Academic View for a case.
 */
router.post('/analyze', async (req, res) => {
    const { case_data, analysis } = req.body;
    try {
        const insights = await generateAcademicInsights(case_data, analysis);
        res.json(insights);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /academic/chat
 * Academic Assistant Chat
 */
router.post('/chat', async (req, res) => {
    const { message, context, history } = req.body;
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4-turbo-preview",
            messages: [
                { role: "system", content: `You are an Academic Medical Coding Assistant. Base your answer on this case context: ${context}. Keep it educational.` },
                ...history,
                { role: "user", content: message }
            ]
        });
        res.json({ reply: response.choices[0].message.content });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /academic/simulate
 * Generate a new similar exam question.
 */
router.post('/simulate', async (req, res) => {
    const { original_note } = req.body;
    try {
        const scenario = await generateSimulation(original_note);
        res.json(scenario);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
