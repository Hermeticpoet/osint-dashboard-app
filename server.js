// Load environment variables from .env file (e.g. PORT, API keys)
import dotenv from 'dotenv';
dotenv.config();

// Import Express framework
import express from 'express';

// Import your route modules
import scanRoutes from './routes/scan.js'; // handles POST /scan
import resultsRouter from './routes/results.js'; // handles GET /results

// Create the Express application
const app = express();

// Middleware to parse incoming JSON request bodies
app.use(express.json());

// Mount your routes
// All requests to /scan will be handled by scanRoutes
app.use('/scan', scanRoutes);

// All requests to /results will be handled by resultsRouter
app.use('/results', resultsRouter);

// Root route (optional) — simple health check or welcome message
app.get('/', (req, res) => {
  res.send('Hello from Express!');
});

// Start the server on the port defined in .env or default to 3000
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
