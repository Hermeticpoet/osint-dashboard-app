// Load environment variables from .env file into process.env
require('dotenv').config();

// Set up Express Server with Helmet Security
const express = require('express');
const helmet = require('helmet');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.send('OSINT Dashboard is live!');
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
