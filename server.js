// server.js
import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import scanRoutes from './routes/scan.js';
import resultsRoutes from './routes/results.js';
import authRouter from './routes/auth.js';
import { authenticateToken, authorizeRole } from './middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// Public route: login
app.use('/', authRouter);

// Protected routes:
// - admin only: POST /scan, GET /results/export.csv, DELETE /results/:id
// - read-only + admin: GET /results

// Protect /scan with admin
app.use('/scan', authenticateToken, authorizeRole('admin'), scanRoutes);

// Protect /results with mixed access
app.use('/results', resultsRoutes);

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Root (optional) - serve index.html for SPA routing
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 4000;

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

export { app };
