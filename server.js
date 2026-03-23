require('dotenv').config();
const express = require('express');
const cors = require('cors');

const casesRouter = require('./src/routes/cases');
const analyzeRouter = require('./src/routes/analyze');

const app = express();
app.use(cors());
app.use(express.json());

// API Key Middleware
const authenticateKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: 'Unauthorized: Invalid API Key' });
  }
  next();
};

app.use('/cases', authenticateKey, casesRouter);
app.use('/analyze-case', authenticateKey, analyzeRouter);

// Health check
app.get('/', (req, res) => {
  res.send('Medical Coding Engine is running');
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
