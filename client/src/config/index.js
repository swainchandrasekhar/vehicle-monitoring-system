const config = {
  apiUrl: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  wsUrl: process.env.REACT_APP_WS_URL || 'http://localhost:5000',
  mapCenter: [12.9716, 77.5946],
  mapZoom: 13,
};

export default config;
