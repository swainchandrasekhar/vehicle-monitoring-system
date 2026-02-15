import { create } from 'zustand';
import { authAPI } from '../services/api';
import socketService from '../services/socket';

const useStore = create((set, get) => ({
  user: JSON.parse(localStorage.getItem('user')) || null,
  token: localStorage.getItem('token') || null,
  isAuthenticated: !!localStorage.getItem('token'),
  vehicles: [],
  selectedVehicle: null,
  alerts: [],
  accidents: [],
  loading: false,
  error: null,

  login: async (credentials) => {
    try {
      set({ loading: true, error: null });
      const response = await authAPI.login(credentials);
      
      const { user, token } = response.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      set({ user, token, isAuthenticated: true, loading: false });
      socketService.connect(token);
      
      return true;
    } catch (error) {
      set({ error: error.message || 'Login failed', loading: false });
      return false;
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    socketService.disconnect();
    set({ user: null, token: null, isAuthenticated: false, vehicles: [], alerts: [] });
  },

  setVehicles: (vehicles) => set({ vehicles }),
  
  updateVehicleLocation: (locationUpdate) => {
    const vehicles = get().vehicles.map(vehicle => 
      vehicle.id === locationUpdate.vehicleId
        ? { 
            ...vehicle, 
            latitude: locationUpdate.latitude,
            longitude: locationUpdate.longitude,
            speed_kmh: locationUpdate.speed,
            heading: locationUpdate.heading,
          }
        : vehicle
    );
    set({ vehicles });
  },

  setSelectedVehicle: (vehicle) => set({ selectedVehicle: vehicle }),
  setAlerts: (alerts) => set({ alerts }),
  addAlert: (alert) => set({ alerts: [alert, ...get().alerts] }),
  setAccidents: (accidents) => set({ accidents }),
  addAccident: (accident) => set({ accidents: [accident, ...get().accidents] }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),
}));

export default useStore;
