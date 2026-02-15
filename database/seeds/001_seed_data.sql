-- =====================================================
-- SEED DATA FOR TESTING
-- =====================================================

-- 1. Create test users (password is 'password123' - bcrypt hash)
INSERT INTO users (email, password_hash, full_name, phone, role, status) VALUES
('admin@vehicle.local', '$2b$10$rPqpXqDxJQh8qKQJ3BZzT.6YwPz8OXKlqWzv5jV1V0c5XKv3VzXzK', 'System Admin', '+1234567890', 'admin', 'active'),
('driver1@vehicle.local', '$2b$10$rPqpXqDxJQh8qKQJ3BZzT.6YwPz8OXKlqWzv5jV1V0c5XKv3VzXzK', 'John Driver', '+1234567891', 'driver', 'active'),
('driver2@vehicle.local', '$2b$10$rPqpXqDxJQh8qKQJ3BZzT.6YwPz8OXKlqWzv5jV1V0c5XKv3VzXzK', 'Jane Driver', '+1234567892', 'driver', 'active'),
('driver3@vehicle.local', '$2b$10$rPqpXqDxJQh8qKQJ3BZzT.6YwPz8OXKlqWzv5jV1V0c5XKv3VzXzK', 'Bob Driver', '+1234567893', 'driver', 'active'),
('viewer1@vehicle.local', '$2b$10$rPqpXqDxJQh8qKQJ3BZzT.6YwPz8OXKlqWzv5jV1V0c5XKv3VzXzK', 'View User', '+1234567894', 'viewer', 'active')
ON CONFLICT (email) DO NOTHING;

-- 2. Create test vehicles (with locations in a sample city - using Bangalore, India coordinates)
INSERT INTO vehicles (registration_number, driver_id, make, model, year, color, status, last_location, last_location_time, speed_kmh, heading)
SELECT 
    'KA01AB1234',
    (SELECT id FROM users WHERE email = 'driver1@vehicle.local'),
    'Toyota', 'Camry', 2022, 'White', 'active',
    ST_MakePoint(77.5946, 12.9716)::geography,
    CURRENT_TIMESTAMP,
    45.5, 90.0
WHERE NOT EXISTS (SELECT 1 FROM vehicles WHERE registration_number = 'KA01AB1234');

INSERT INTO vehicles (registration_number, driver_id, make, model, year, color, status, last_location, last_location_time, speed_kmh, heading)
SELECT 
    'KA01CD5678',
    (SELECT id FROM users WHERE email = 'driver2@vehicle.local'),
    'Honda', 'Civic', 2023, 'Black', 'active',
    ST_MakePoint(77.5850, 12.9650)::geography,
    CURRENT_TIMESTAMP,
    30.0, 180.0
WHERE NOT EXISTS (SELECT 1 FROM vehicles WHERE registration_number = 'KA01CD5678');

INSERT INTO vehicles (registration_number, driver_id, make, model, year, color, status, last_location, last_location_time, speed_kmh, heading)
SELECT 
    'KA01EF9012',
    (SELECT id FROM users WHERE email = 'driver3@vehicle.local'),
    'Maruti', 'Swift', 2021, 'Red', 'active',
    ST_MakePoint(77.6100, 12.9800)::geography,
    CURRENT_TIMESTAMP,
    55.0, 270.0
WHERE NOT EXISTS (SELECT 1 FROM vehicles WHERE registration_number = 'KA01EF9012');

INSERT INTO vehicles (registration_number, driver_id, make, model, year, color, status, last_location, last_location_time, speed_kmh, heading)
SELECT 
    'KA02XY3456',
    NULL,
    'Hyundai', 'i20', 2020, 'Blue', 'inactive',
    ST_MakePoint(77.5700, 12.9500)::geography,
    CURRENT_TIMESTAMP - INTERVAL '2 hours',
    0.0, 0.0
WHERE NOT EXISTS (SELECT 1 FROM vehicles WHERE registration_number = 'KA02XY3456');

INSERT INTO vehicles (registration_number, driver_id, make, model, year, color, status, last_location, last_location_time, speed_kmh, heading)
SELECT 
    'KA03PQ7890',
    NULL,
    'Tata', 'Nexon', 2023, 'Silver', 'active',
    ST_MakePoint(77.6200, 12.9550)::geography,
    CURRENT_TIMESTAMP,
    40.0, 45.0
WHERE NOT EXISTS (SELECT 1 FROM vehicles WHERE registration_number = 'KA03PQ7890');

-- 3. Add some location history for vehicles
INSERT INTO locations (vehicle_id, location, speed_kmh, heading, altitude_m, accuracy_m, timestamp)
SELECT 
    v.id,
    ST_MakePoint(77.5946 + (random() - 0.5) * 0.01, 12.9716 + (random() - 0.5) * 0.01)::geography,
    30 + random() * 40,
    random() * 360,
    920 + random() * 10,
    5 + random() * 10,
    CURRENT_TIMESTAMP - (INTERVAL '1 minute' * generate_series(1, 10))
FROM vehicles v
WHERE v.registration_number = 'KA01AB1234';

INSERT INTO locations (vehicle_id, location, speed_kmh, heading, altitude_m, accuracy_m, timestamp)
SELECT 
    v.id,
    ST_MakePoint(77.5850 + (random() - 0.5) * 0.01, 12.9650 + (random() - 0.5) * 0.01)::geography,
    20 + random() * 50,
    random() * 360,
    915 + random() * 10,
    5 + random() * 10,
    CURRENT_TIMESTAMP - (INTERVAL '1 minute' * generate_series(1, 10))
FROM vehicles v
WHERE v.registration_number = 'KA01CD5678';

-- 4. Add a sample accident
INSERT INTO accidents (vehicle_id, location, severity, status, ml_confidence, impact_force, description, reported_at)
SELECT 
    v.id,
    ST_MakePoint(77.5900, 12.9680)::geography,
    'moderate',
    'reported',
    0.85,
    25.5,
    'ML detected sudden deceleration and impact. Vehicle stopped after collision.',
    CURRENT_TIMESTAMP - INTERVAL '30 minutes'
FROM vehicles v
WHERE v.registration_number = 'KA01CD5678'
AND NOT EXISTS (SELECT 1 FROM accidents WHERE vehicle_id = v.id);

-- 5. Create an alert for the accident
INSERT INTO alerts (type, accident_id, location, radius_meters, title, message, severity, active, expires_at, created_by)
SELECT 
    'accident',
    a.id,
    a.location,
    1500,
    'Accident Reported Ahead',
    'An accident has been detected on this route. Please slow down and proceed with caution.',
    a.severity,
    true,
    CURRENT_TIMESTAMP + INTERVAL '2 hours',
    (SELECT id FROM users WHERE email = 'admin@vehicle.local')
FROM accidents a
WHERE a.status = 'reported'
AND NOT EXISTS (SELECT 1 FROM alerts WHERE accident_id = a.id)
LIMIT 1;

-- =====================================================
-- VERIFY SEEDED DATA
-- =====================================================
SELECT 'Users:' as info, COUNT(*) as count FROM users
UNION ALL
SELECT 'Vehicles:', COUNT(*) FROM vehicles
UNION ALL
SELECT 'Locations:', COUNT(*) FROM locations
UNION ALL
SELECT 'Accidents:', COUNT(*) FROM accidents
UNION ALL
SELECT 'Alerts:', COUNT(*) FROM alerts;
