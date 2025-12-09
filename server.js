// server.js
import 'dotenv/config';
import express from 'express';
import scanRoutes from './routes/scan.js';
import resultsRoutes from './routes/results.js';
import authRouter from './routes/auth.js';
import { authenticateToken, authorizeRole } from './middleware/auth.js';

const app = express();
app.use(express.json());

// Public route: login
app.use('/', authRouter);

// Protected routes:
// - admin only: POST /scan, GET /results/export.csv, DELETE /results/:id
// - read-only + admin: GET /results, GET /results/:id

// Protect /scan with admin
app.use('/scan', authenticateToken, authorizeRole('admin'), scanRoutes);

// Protect /results with mixed access
app.use(
  '/results/export.csv',
  authenticateToken,
  authorizeRole('admin'),
  resultsRoutes
);

app.use(
  '/results',
  authenticateToken,
  authorizeRole(['admin', 'read-only']),
  resultsRoutes
);

// Root (optional)
app.get('/', (req, res) => {
  res.send('osint-dashboard API');
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
