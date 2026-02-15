const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');
const { redis } = require('../config/redis');
const jwtConfig = require('../config/jwt');

let io;

const initSocket = (server) => {
  io = socketIO(server, {
    cors: {
      origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Authentication middleware for socket connections
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(token, jwtConfig.secret);
      
      // Get user from database
      const result = await pool.query(
        'SELECT id, email, full_name, role FROM users WHERE id = $1',
        [decoded.userId]
      );

      if (result.rows.length === 0) {
        return next(new Error('User not found'));
      }

      socket.user = result.rows[0];
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  // Connection handler
  io.on('connection', (socket) => {
    console.log(`✓ Client connected: ${socket.user.email} (${socket.id})`);

    // Join user-specific room
    socket.join(`user:${socket.user.id}`);
    
    // Join role-specific room
    socket.join(`role:${socket.user.role}`);

    // Send welcome message
    socket.emit('connected', {
      message: 'Connected to Vehicle Monitoring System',
      user: socket.user,
    });

    // Handle vehicle location subscription
    socket.on('subscribe:vehicles', async () => {
      socket.join('vehicles:all');
      console.log(`User ${socket.user.email} subscribed to vehicle updates`);
      
      // Send current vehicle positions
      const result = await pool.query(`
        SELECT 
          v.id, 
          v.registration_number,
          v.status,
          v.speed_kmh,
          v.heading,
          ST_Y(v.last_location::geometry) as latitude,
          ST_X(v.last_location::geometry) as longitude,
          v.last_location_time
        FROM vehicles v
        WHERE v.status = 'active'
      `);

      socket.emit('vehicles:current', result.rows);
    });

    // Handle accident/alert subscription
    socket.on('subscribe:alerts', async () => {
      socket.join('alerts:all');
      console.log(`User ${socket.user.email} subscribed to alerts`);

      // Send active alerts
      const result = await pool.query(`
        SELECT 
          a.*,
          ST_Y(a.location::geometry) as latitude,
          ST_X(a.location::geometry) as longitude
        FROM alerts a
        WHERE a.active = true 
          AND (a.expires_at IS NULL OR a.expires_at > NOW())
      `);

      socket.emit('alerts:current', result.rows);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`✗ Client disconnected: ${socket.user.email} (${socket.id})`);
    });
  });

  // Subscribe to Redis pub/sub for real-time updates
  const subscriber = redis.duplicate();

  subscriber.subscribe('vehicle:location', 'accident:reported', (err, count) => {
    if (err) {
      console.error('Redis subscription error:', err);
    } else {
      console.log(`✓ Subscribed to ${count} Redis channels`);
    }
  });

  subscriber.on('message', (channel, message) => {
    const data = JSON.parse(message);

    switch (channel) {
      case 'vehicle:location':
        // Broadcast vehicle location update to all subscribed clients
        io.to('vehicles:all').emit('vehicle:location:update', data);
        break;

      case 'accident:reported':
        // Broadcast accident alert to all subscribed clients
        io.to('alerts:all').emit('accident:new', data);
        break;
    }
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};

module.exports = { initSocket, getIO };
