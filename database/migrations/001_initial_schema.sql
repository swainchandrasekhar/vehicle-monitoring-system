-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- =====================================================
-- 1. USERS TABLE (Authentication & Roles)
-- =====================================================
CREATE TYPE user_role AS ENUM ('admin', 'driver', 'viewer');
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended');

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    role user_role NOT NULL DEFAULT 'viewer',
    status user_status NOT NULL DEFAULT 'active',
    last_login TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for users
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- =====================================================
-- 2. VEHICLES TABLE
-- =====================================================
CREATE TYPE vehicle_status AS ENUM ('active', 'inactive', 'emergency', 'maintenance');

CREATE TABLE IF NOT EXISTS vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    registration_number VARCHAR(50) UNIQUE NOT NULL,
    driver_id UUID REFERENCES users(id) ON DELETE SET NULL,
    make VARCHAR(100),
    model VARCHAR(100),
    year INTEGER,
    color VARCHAR(50),
    status vehicle_status NOT NULL DEFAULT 'inactive',
    last_location GEOGRAPHY(Point, 4326),
    last_location_time TIMESTAMP,
    speed_kmh DECIMAL(5,2),
    heading DECIMAL(5,2),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Spatial index
CREATE INDEX IF NOT EXISTS idx_vehicles_last_location ON vehicles USING GIST(last_location);
CREATE INDEX IF NOT EXISTS idx_vehicles_driver ON vehicles(driver_id);

-- =====================================================
-- 3. LOCATIONS TABLE (GPS Tracking)
-- =====================================================
CREATE TABLE IF NOT EXISTS locations (
    id BIGSERIAL PRIMARY KEY,
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    location GEOGRAPHY(Point, 4326) NOT NULL,
    speed_kmh DECIMAL(5,2),
    heading DECIMAL(5,2),
    altitude_m DECIMAL(7,2),
    accuracy_m DECIMAL(5,2),
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_locations_vehicle_time ON locations(vehicle_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_locations_spatial ON locations USING GIST(location);

-- =====================================================
-- 4. ACCIDENTS TABLE
-- =====================================================
CREATE TYPE accident_severity AS ENUM ('minor', 'moderate', 'severe', 'critical');
CREATE TYPE accident_status AS ENUM ('reported', 'verified', 'responding', 'resolved', 'false_alarm');

CREATE TABLE IF NOT EXISTS accidents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
    location GEOGRAPHY(Point, 4326) NOT NULL,
    severity accident_severity NOT NULL DEFAULT 'moderate',
    status accident_status NOT NULL DEFAULT 'reported',
    ml_confidence DECIMAL(3,2),
    impact_force DECIMAL(10,2),
    description TEXT,
    reported_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    verified_at TIMESTAMP,
    resolved_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_accidents_location ON accidents USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_accidents_status ON accidents(status);

-- =====================================================
-- 5. ALERTS TABLE
-- =====================================================
CREATE TYPE alert_type AS ENUM ('accident', 'hazard', 'traffic', 'weather', 'emergency');

CREATE TABLE IF NOT EXISTS alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type alert_type NOT NULL,
    accident_id UUID REFERENCES accidents(id) ON DELETE CASCADE,
    location GEOGRAPHY(Point, 4326) NOT NULL,
    radius_meters INTEGER NOT NULL DEFAULT 1000,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    severity accident_severity NOT NULL DEFAULT 'moderate',
    active BOOLEAN NOT NULL DEFAULT true,
    expires_at TIMESTAMP,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_alerts_location ON alerts USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_alerts_active ON alerts(active);

-- =====================================================
-- 6. UPDATE TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_vehicles_updated_at ON vehicles;
CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON vehicles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_accidents_updated_at ON accidents;
CREATE TRIGGER update_accidents_updated_at BEFORE UPDATE ON accidents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_alerts_updated_at ON alerts;
CREATE TRIGGER update_alerts_updated_at BEFORE UPDATE ON alerts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update vehicle's last location
CREATE OR REPLACE FUNCTION update_vehicle_last_location()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE vehicles 
    SET 
        last_location = NEW.location,
        last_location_time = NEW.timestamp,
        speed_kmh = NEW.speed_kmh,
        heading = NEW.heading
    WHERE id = NEW.vehicle_id;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_vehicle_location_trigger ON locations;
CREATE TRIGGER update_vehicle_location_trigger AFTER INSERT ON locations
    FOR EACH ROW EXECUTE FUNCTION update_vehicle_last_location();

-- =====================================================
-- USEFUL FUNCTIONS
-- =====================================================

-- Find vehicles within radius
CREATE OR REPLACE FUNCTION find_vehicles_near_point(
    lat DECIMAL,
    lon DECIMAL,
    radius_meters INTEGER
)
RETURNS TABLE (
    vehicle_id UUID,
    registration_number VARCHAR,
    distance_meters DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        v.id,
        v.registration_number,
        ST_Distance(
            v.last_location,
            ST_MakePoint(lon, lat)::geography
        ) as distance_meters
    FROM vehicles v
    WHERE 
        v.status = 'active'
        AND ST_DWithin(
            v.last_location,
            ST_MakePoint(lon, lat)::geography,
            radius_meters
        )
    ORDER BY distance_meters;
END;
$$ language 'plpgsql';

COMMENT ON FUNCTION find_vehicles_near_point IS 'Find all active vehicles within specified radius of a point';
