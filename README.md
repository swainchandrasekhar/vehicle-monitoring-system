# 🚗 Vehicle Monitoring & Accident Alert System

Real-time vehicle tracking system with ML-based accident detection and instant alert broadcasting.

![System Status](https://img.shields.io/badge/status-active-success)
![License](https://img.shields.io/badge/license-MIT-blue)

## 🌟 Features

- **Real-time Vehicle Tracking** - Live GPS tracking on interactive map
- **Accident Detection** - ML-based collision detection using phone sensors
- **Instant Alerts** - Real-time accident broadcasts to nearby vehicles
- **Geospatial Queries** - Find vehicles within radius, proximity alerts
- **Role-based Access** - Admin, Driver, and Viewer roles
- **Historical Data** - Time-series location tracking and playback
- **WebSocket Updates** - Live updates without page refresh

## 🏗️ Architecture
┌─────────────┐ WebSocket ┌──────────────┐
│ React │ ←─────────────────→ │ Node.js │
│ Frontend │ REST API │ Backend │
└─────────────┘ └──────┬───────┘
│
┌────────────┼────────────┐
│ │ │
┌─────▼────┐ ┌────▼────┐ ┌────▼────┐
│PostgreSQL│ │ Redis │ │ML Model │
│+ PostGIS │ │ Pub/Sub │ │(Future) │
└──────────┘ └─────────┘ └─────────┘

text


## 🛠️ Tech Stack

### Frontend
- **React 18** - UI framework
- **Leaflet** - Interactive maps (OpenStreetMap)
- **Socket.io Client** - Real-time communication
- **Zustand** - State management
- **TailwindCSS** - Styling
- **Axios** - HTTP client

### Backend
- **Node.js + Express** - REST API
- **Socket.io** - WebSocket server
- **PostgreSQL 17 + PostGIS** - Geospatial database
- **Redis** - Caching & Pub/Sub
- **JWT** - Authentication
- **Bcrypt** - Password hashing

## 📦 Installation

### Prerequisites
- Node.js 20+
- PostgreSQL 17+ with PostGIS
- Redis 8+

### 1. Clone Repository

```bash
git clone https://github.com/YOUR_USERNAME/vehicle-monitoring-system.git
cd vehicle-monitoring-system
2. Database Setup
Bash

# Create database
sudo -u postgres psql
CREATE USER vehicle_admin WITH PASSWORD 'your_password';
CREATE DATABASE vehicle_monitoring OWNER vehicle_admin;
\c vehicle_monitoring
CREATE EXTENSION postgis;
\q

# Run migrations
psql -h localhost -U vehicle_admin -d vehicle_monitoring -f database/migrations/001_initial_schema.sql

# Seed test data
psql -h localhost -U vehicle_admin -d vehicle_monitoring -f database/seeds/001_seed_data.sql
3. Backend Setup
Bash

cd server
npm install

# Create .env file
cat > .env << 'ENV'
NODE_ENV=development
PORT=5000
DATABASE_URL=postgresql://vehicle_admin:your_password@localhost:5432/vehicle_monitoring
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:3000
ENV

# Start server
npm run dev
4. Frontend Setup
Bash

cd ../client
npm install

# Create .env file
cat > .env << 'ENV'
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_WS_URL=http://localhost:5000
ENV

# Start frontend
npm start
🚀 Usage
Default Login Credentials
Role	Email	Password
Admin	admin@vehicle.local	sekhar
Driver	driver1@vehicle.local	sekhar
Viewer	viewer1@vehicle.local	sekhar
API Endpoints
Authentication
Bash

POST /api/auth/login
POST /api/auth/register
GET  /api/auth/profile
Vehicles
Bash

GET  /api/vehicles
GET  /api/vehicles/:id
POST /api/vehicles/:id/location
GET  /api/vehicles/:id/history
GET  /api/vehicles/nearby
Accidents
Bash

POST /api/accidents
GET  /api/accidents
GET  /api/accidents/alerts
WebSocket Events
JavaScript

// Subscribe to updates
socket.emit('subscribe:vehicles');
socket.emit('subscribe:alerts');

// Listen for updates
socket.on('vehicle:location:update', (data) => { ... });
socket.on('accident:new', (data) => { ... });
📊 Database Schema
users - Authentication and user roles
vehicles - Vehicle information with geospatial data
locations - Time-series GPS tracking history
accidents - Accident events with ML confidence scores
alerts - Alert broadcasting with radius-based targeting
🧪 Testing
Test Real-time Location Update
Bash

# Get token
TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "driver1@vehicle.local", "password": "sekhar"}' | \
  jq -r '.data.token')

# Update location
curl -X POST http://localhost:5000/api/vehicles/VEHICLE_ID/location \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 12.9800,
    "longitude": 77.6100,
    "speed": 65,
    "heading": 90
  }'
Test Accident Report
Bash

curl -X POST http://localhost:5000/api/accidents \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 12.9750,
    "longitude": 77.6050,
    "severity": "severe",
    "mlConfidence": 0.92,
    "description": "High-speed collision detected"
  }'
🗺️ Roadmap
 Real-time vehicle tracking
 WebSocket updates
 Accident alert system
 Authentication & authorization
 ML accident detection model
 1000+ vehicle simulation
 Route optimization
 Mobile app (React Native)
 Heatmap visualization
 Historical playback
 Push notifications
 Deployment & CI/CD
📝 Project Structure
text

vehicle-monitoring-system/
├── client/              # React frontend
│   ├── src/
│   │   ├── components/  # UI components
│   │   ├── services/    # API & WebSocket
│   │   ├── store/       # State management
│   │   └── config/      # Configuration
│   └── package.json
│
├── server/              # Node.js backend
│   ├── src/
│   │   ├── controllers/ # Business logic
│   │   ├── routes/      # API routes
│   │   ├── middleware/  # Auth, validation
│   │   ├── socket/      # WebSocket handlers
│   │   └── config/      # Database, Redis
│   └── package.json
│
└── database/
    ├── migrations/      # Database schema
    └── seeds/          # Test data
🤝 Contributing
Contributions are welcome! Please feel free to submit a Pull Request.

📄 License
MIT License - feel free to use this project for learning or commercial purposes.

👨‍💻 Author
Built with ❤️ as a vehicle safety monitoring system

🙏 Acknowledgments
OpenStreetMap for map tiles
Leaflet for mapping library
PostgreSQL + PostGIS for geospatial capabilities
⭐ Star this repo if you find it useful!
