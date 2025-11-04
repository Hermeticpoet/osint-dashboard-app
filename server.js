import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import scanRoutes from './routes/scan.js';

const app = express();

// Middleware to parse JSON
app.use(express.json());

// 🔌 Mount your scan route
app.use('/scan', scanRoutes);

// Root route (optional)
app.get('/', (req, res) => {
  res.send('Hello from Express!');
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
