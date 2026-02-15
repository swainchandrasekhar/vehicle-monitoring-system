import { io } from 'socket.io-client';
import config from '../config';

class SocketService {
  constructor() {
    this.socket = null;
    this.connected = false;
  }

  connect(token) {
    if (this.socket?.connected) {
      return this.socket;
    }

    this.socket = io(config.wsUrl, {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    this.socket.on('connect', () => {
      console.log('✓ WebSocket connected');
      this.connected = true;
    });

    this.socket.on('disconnect', () => {
      console.log('✗ WebSocket disconnected');
      this.connected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket error:', error.message);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
    }
  }

  subscribeToVehicles() {
    if (this.socket) {
      this.socket.emit('subscribe:vehicles');
    }
  }

  subscribeToAlerts() {
    if (this.socket) {
      this.socket.emit('subscribe:alerts');
    }
  }

  on(event, callback) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  isConnected() {
    return this.connected;
  }
}

const socketService = new SocketService();
export default socketService;
