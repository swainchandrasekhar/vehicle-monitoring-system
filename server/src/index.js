const http = require('http');
const app = require('./app');
const config = require('./config');
const { initSocket } = require('./socket');

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io
initSocket(server);

// Start server
const PORT = config.port;

server.listen(PORT, () => {
  console.log('========================================');
  console.log('  Vehicle Monitoring System - Server');
  console.log('========================================');
  console.log(`✓ Server running on port ${PORT}`);
  console.log(`✓ Environment: ${config.nodeEnv}`);
  console.log(`✓ Health check: http://localhost:${PORT}/health`);
  console.log(`✓ WebSocket: ws://localhost:${PORT}`);
  console.log('========================================');
});

// Handle shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down...');
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
});
