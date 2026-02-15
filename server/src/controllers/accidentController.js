const { pool } = require('../config/database');
const { redis } = require('../config/redis');
const { success, error } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');

// Report accident (from ML model or manual)
const reportAccident = asyncHandler(async (req, res) => {
  const {
    vehicleId,
    latitude,
    longitude,
    severity = 'moderate',
    mlConfidence,
    impactForce,
    description,
  } = req.body;

  if (!latitude || !longitude) {
    return error(res, 'Latitude and longitude are required', 400);
  }

  // Insert accident
  const accidentResult = await pool.query(
    `INSERT INTO accidents (vehicle_id, location, severity, status, ml_confidence, impact_force, description)
     VALUES ($1, ST_MakePoint($2, $3)::geography, $4, 'reported', $5, $6, $7)
     RETURNING *`,
    [vehicleId || null, longitude, latitude, severity, mlConfidence, impactForce, description]
  );

  const accident = accidentResult.rows[0];

  // Create alert
  const alertResult = await pool.query(
    `INSERT INTO alerts (type, accident_id, location, radius_meters, title, message, severity, active, expires_at, created_by)
     VALUES ('accident', $1, ST_MakePoint($2, $3)::geography, 1500, $4, $5, $6, true, NOW() + INTERVAL '2 hours', $7)
     RETURNING *`,
    [
      accident.id,
      longitude,
      latitude,
      'Accident Reported',
      description || 'An accident has been detected. Proceed with caution.',
      severity,
      req.user.id,
    ]
  );

  const alert = alertResult.rows[0];

  // Publish to Redis for real-time broadcast
  await redis.publish('accident:reported', JSON.stringify({
    accidentId: accident.id,
    alertId: alert.id,
    latitude,
    longitude,
    severity,
    timestamp: accident.reported_at,
  }));

  return success(res, {
    accident,
    alert,
  }, 'Accident reported successfully', 201);
});

// Get all accidents
const getAllAccidents = asyncHandler(async (req, res) => {
  const { status, severity, limit = 50 } = req.query;

  let query = `
    SELECT 
      a.*,
      ST_Y(a.location::geometry) as latitude,
      ST_X(a.location::geometry) as longitude,
      v.registration_number
    FROM accidents a
    LEFT JOIN vehicles v ON a.vehicle_id = v.id
    WHERE 1=1
  `;

  const params = [];
  
  if (status) {
    params.push(status);
    query += ` AND a.status = $${params.length}`;
  }

  if (severity) {
    params.push(severity);
    query += ` AND a.severity = $${params.length}`;
  }

  params.push(limit);
  query += ` ORDER BY a.reported_at DESC LIMIT $${params.length}`;

  const result = await pool.query(query, params);

  return success(res, {
    accidents: result.rows,
    count: result.rows.length,
  });
});

// Get active alerts
const getActiveAlerts = asyncHandler(async (req, res) => {
  const { latitude, longitude, radius = 5000 } = req.query;

  let query = `
    SELECT 
      a.*,
      ST_Y(a.location::geometry) as latitude,
      ST_X(a.location::geometry) as longitude,
      acc.severity as accident_severity,
      acc.reported_at
    FROM alerts a
    LEFT JOIN accidents acc ON a.accident_id = acc.id
    WHERE a.active = true 
      AND (a.expires_at IS NULL OR a.expires_at > NOW())
  `;

  const params = [];

  if (latitude && longitude) {
    params.push(parseFloat(longitude), parseFloat(latitude), parseInt(radius));
    query += ` AND ST_DWithin(
      a.location,
      ST_MakePoint($1, $2)::geography,
      $3
    )`;
  }

  query += ` ORDER BY a.created_at DESC`;

  const result = await pool.query(query, params);

  return success(res, {
    alerts: result.rows,
    count: result.rows.length,
  });
});

module.exports = {
  reportAccident,
  getAllAccidents,
  getActiveAlerts,
};
