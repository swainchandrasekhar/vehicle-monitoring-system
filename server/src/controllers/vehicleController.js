const { pool } = require('../config/database');
const { redis } = require('../config/redis');
const { success, error } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');

// Get all vehicles
const getAllVehicles = asyncHandler(async (req, res) => {
  const { status, limit = 50, offset = 0 } = req.query;

  let query = `
    SELECT 
      v.id, 
      v.registration_number, 
      v.make, 
      v.model, 
      v.year, 
      v.color, 
      v.status,
      v.speed_kmh,
      v.heading,
      v.last_location_time,
      ST_Y(v.last_location::geometry) as latitude,
      ST_X(v.last_location::geometry) as longitude,
      u.full_name as driver_name,
      u.email as driver_email
    FROM vehicles v
    LEFT JOIN users u ON v.driver_id = u.id
  `;

  const params = [];
  
  if (status) {
    query += ` WHERE v.status = $1`;
    params.push(status);
  }

  query += ` ORDER BY v.last_location_time DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(limit, offset);

  const result = await pool.query(query, params);

  return success(res, {
    vehicles: result.rows,
    count: result.rows.length,
  });
});

// Get single vehicle
const getVehicle = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const result = await pool.query(
    `SELECT 
      v.*,
      ST_Y(v.last_location::geometry) as latitude,
      ST_X(v.last_location::geometry) as longitude,
      u.full_name as driver_name,
      u.email as driver_email,
      u.phone as driver_phone
    FROM vehicles v
    LEFT JOIN users u ON v.driver_id = u.id
    WHERE v.id = $1`,
    [id]
  );

  if (result.rows.length === 0) {
    return error(res, 'Vehicle not found', 404);
  }

  return success(res, { vehicle: result.rows[0] });
});

// Update vehicle location (from GPS/mobile)
const updateLocation = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { latitude, longitude, speed, heading, altitude, accuracy } = req.body;

  if (!latitude || !longitude) {
    return error(res, 'Latitude and longitude are required', 400);
  }

  // Insert into locations table (trigger will update vehicles table)
  const result = await pool.query(
    `INSERT INTO locations (vehicle_id, location, speed_kmh, heading, altitude_m, accuracy_m, timestamp)
     VALUES ($1, ST_MakePoint($2, $3)::geography, $4, $5, $6, $7, CURRENT_TIMESTAMP)
     RETURNING id, timestamp`,
    [id, longitude, latitude, speed || 0, heading || 0, altitude || 0, accuracy || 10]
  );

  // Publish to Redis for real-time updates
  const locationUpdate = {
    vehicleId: id,
    latitude,
    longitude,
    speed,
    heading,
    timestamp: result.rows[0].timestamp,
  };

  await redis.publish('vehicle:location', JSON.stringify(locationUpdate));

  return success(res, {
    message: 'Location updated',
    location: locationUpdate,
  });
});

// Get vehicle location history
const getLocationHistory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { hours = 24, limit = 100 } = req.query;

  const result = await pool.query(
    `SELECT 
      id,
      ST_Y(location::geometry) as latitude,
      ST_X(location::geometry) as longitude,
      speed_kmh,
      heading,
      altitude_m,
      accuracy_m,
      timestamp
    FROM locations
    WHERE vehicle_id = $1 
      AND timestamp > NOW() - INTERVAL '${parseInt(hours)} hours'
    ORDER BY timestamp DESC
    LIMIT $2`,
    [id, limit]
  );

  return success(res, {
    history: result.rows,
    count: result.rows.length,
  });
});

// Find vehicles near a point
const findNearby = asyncHandler(async (req, res) => {
  const { latitude, longitude, radius = 1000 } = req.query;

  if (!latitude || !longitude) {
    return error(res, 'Latitude and longitude are required', 400);
  }

  const result = await pool.query(
    `SELECT * FROM find_vehicles_near_point($1, $2, $3)`,
    [parseFloat(latitude), parseFloat(longitude), parseInt(radius)]
  );

  return success(res, {
    vehicles: result.rows,
    count: result.rows.length,
    radius_meters: parseInt(radius),
  });
});

module.exports = {
  getAllVehicles,
  getVehicle,
  updateLocation,
  getLocationHistory,
  findNearby,
};
