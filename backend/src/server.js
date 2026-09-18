const express = require('express');
const cors = require('cors');
require('dotenv').config();

const db = require('./config/database');
const { seedData } = require('./models/seed');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const fs = require('fs');
const path = require('path');

// API Routes
app.use('/api', apiRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Serve frontend production build if dist directory exists
const frontendDistPath = path.join(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
}

async function startServer() {
  try {
    await db.runSchema();
    await seedData();

    if (process.env.NODE_ENV !== 'test') {
      app.listen(PORT, () => {
        console.log(`===================================================`);
        console.log(` PERN Industrial ERP Server running on port ${PORT}`);
        console.log(` API Endpoint: http://localhost:${PORT}/api`);
        console.log(`===================================================`);
      });
    }
  } catch (err) {
    console.error('Failed to initialize database and start server:', err);
  }
}

startServer();

module.exports = app;
