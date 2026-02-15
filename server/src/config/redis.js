const Redis = require('ioredis');
require('dotenv').config();

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
});

redis.on('connect', () => {
  console.log('✓ Redis connected');
});

redis.on('error', (err) => {
  console.error('Redis error:', err);
});

module.exports = { redis };
