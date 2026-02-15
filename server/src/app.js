const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const config = require('./config');
const authRoutes = require('./routes/authRoutes');
const vehicleRoutes = require('./routes/vehicleRoutes');
const accidentRoutes = require('./routes/accidentRoutes');
const { error } = require('./utils/response');

const app = express();

// Security middleware
app.use(helmet());

// CORS
app.use(cors({
  origin: config.corsOrigin,
  credentials: true,
}));

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check route
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/accidents', accidentRoutes);

// 404 handler
app.use((req, res) => {
  return error(res, 'Route not found.', 404);
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  return error(res, err.message || 'Internal server error.', 500);
});

module.exports = app;
