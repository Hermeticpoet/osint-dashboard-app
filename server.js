// Load environment variables
require('dotenv').config();

// Import dependencies
const express = require('express');
const app = express();

// Middleware to parse JSON
app.use(express.json());

// 🔌 Mount your scan route
const scanRoutes = require('./routes/scan');
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
