const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');
const { success, error } = require('../utils/response');
const jwtConfig = require('../config/jwt');
const asyncHandler = require('../utils/asyncHandler');

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, jwtConfig.secret, {
    expiresIn: jwtConfig.expiresIn,
  });
};

// Register new user
const register = asyncHandler(async (req, res) => {
  const { email, password, fullName, phone, role = 'viewer' } = req.body;

  // Validate input
  if (!email || !password || !fullName) {
    return error(res, 'Email, password, and full name are required.', 400);
  }

  // Check if user exists
  const existingUser = await pool.query(
    'SELECT id FROM users WHERE email = $1',
    [email.toLowerCase()]
  );

  if (existingUser.rows.length > 0) {
    return error(res, 'User with this email already exists.', 400);
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  // Create user
  const result = await pool.query(
    `INSERT INTO users (email, password_hash, full_name, phone, role)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, email, full_name, phone, role, status, created_at`,
    [email.toLowerCase(), passwordHash, fullName, phone, role]
  );

  const user = result.rows[0];
  const token = generateToken(user.id);

  return success(res, {
    user: {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      phone: user.phone,
      role: user.role,
    },
    token,
  }, 'Registration successful.', 201);
});

// Login user
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Validate input
  if (!email || !password) {
    return error(res, 'Email and password are required.', 400);
  }

  // Find user
  const result = await pool.query(
    'SELECT * FROM users WHERE email = $1',
    [email.toLowerCase()]
  );

  if (result.rows.length === 0) {
    return error(res, 'Invalid email or password.', 401);
  }

  const user = result.rows[0];

  // Check password
  const isMatch = await bcrypt.compare(password, user.password_hash);

  if (!isMatch) {
    return error(res, 'Invalid email or password.', 401);
  }

  // Check status
  if (user.status !== 'active') {
    return error(res, 'Account is not active. Contact admin.', 403);
  }

  // Update last login
  await pool.query(
    'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
    [user.id]
  );

  const token = generateToken(user.id);

  return success(res, {
    user: {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      phone: user.phone,
      role: user.role,
    },
    token,
  }, 'Login successful.');
});

// Get current user profile
const getProfile = asyncHandler(async (req, res) => {
  return success(res, {
    user: {
      id: req.user.id,
      email: req.user.email,
      fullName: req.user.full_name,
      role: req.user.role,
    },
  });
});

module.exports = { register, login, getProfile };
