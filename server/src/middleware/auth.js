const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');
const { error } = require('../utils/response');
const jwtConfig = require('../config/jwt');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return error(res, 'Access denied. No token provided.', 401);
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, jwtConfig.secret);

    // Get user from database
    const result = await pool.query(
      'SELECT id, email, full_name, role, status FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return error(res, 'User not found.', 401);
    }

    const user = result.rows[0];

    if (user.status !== 'active') {
      return error(res, 'Account is not active.', 403);
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      return error(res, 'Invalid token.', 401);
    }
    if (err.name === 'TokenExpiredError') {
      return error(res, 'Token expired.', 401);
    }
    return error(res, 'Authentication failed.', 500);
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return error(res, 'Authentication required.', 401);
    }

    if (!roles.includes(req.user.role)) {
      return error(res, 'Access denied. Insufficient permissions.', 403);
    }

    next();
  };
};

module.exports = { authenticate, authorize };
