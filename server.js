require('dotenv').config();
const express = require('express');
const cors = require('cors');

const casesRouter = require('./src/routes/cases');
const analyzeRouter = require('./src/routes/analyze');
const assistantRouter = require('./src/routes/assistant');
const academicRouter = require('./src/routes/academic');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/cases', casesRouter);
app.use('/analyze-case', analyzeRouter);
app.use('/assistant', assistantRouter);
app.use('/academic', academicRouter);

// Health check
app.get('/', (req, res) => {
  res.send('Medical Coding Engine is running');
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on port ${PORT}`);
});
