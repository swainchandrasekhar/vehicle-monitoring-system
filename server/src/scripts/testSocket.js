const io = require('socket.io-client');

async function testSocket() {
  console.log('Connecting to WebSocket...\n');

  // Replace with actual token from login
  const token = process.argv[2];

  if (!token) {
    console.error('Usage: node testSocket.js YOUR_JWT_TOKEN');
    process.exit(1);
  }

  const socket = io('http://localhost:5000', {
    auth: { token },
  });

  socket.on('connect', () => {
    console.log('✓ Connected to server');
  });

  socket.on('connected', (data) => {
    console.log('✓ Server says:', data.message);
    console.log('✓ User:', data.user.email, `(${data.user.role})\n`);

    // Subscribe to vehicle updates
    console.log('Subscribing to vehicle updates...');
    socket.emit('subscribe:vehicles');

    // Subscribe to alerts
    console.log('Subscribing to alerts...');
    socket.emit('subscribe:alerts');
  });

  socket.on('vehicles:current', (vehicles) => {
    console.log(`\n✓ Current vehicles (${vehicles.length}):`);
    vehicles.forEach(v => {
      console.log(`  - ${v.registration_number}: ${v.latitude}, ${v.longitude} (${v.speed_kmh} km/h)`);
    });
  });

  socket.on('alerts:current', (alerts) => {
    console.log(`\n✓ Active alerts (${alerts.length}):`);
    alerts.forEach(a => {
      console.log(`  - ${a.title}: ${a.message}`);
    });
  });

  socket.on('vehicle:location:update', (data) => {
    console.log(`\n📍 Vehicle location update:`, data);
  });

  socket.on('accident:new', (data) => {
    console.log(`\n🚨 New accident reported:`, data);
  });

  socket.on('disconnect', () => {
    console.log('\n✗ Disconnected from server');
  });

  socket.on('connect_error', (err) => {
    console.error('\n❌ Connection error:', err.message);
    process.exit(1);
  });
}

testSocket();
